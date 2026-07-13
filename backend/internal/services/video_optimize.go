package services

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"strconv"
	"time"
)

// ffmpeg/ffprobe são resolvidos uma vez no start (LookPath é relativamente caro).
var (
	ffmpegPath, _  = exec.LookPath("ffmpeg")
	ffprobePath, _ = exec.LookPath("ffprobe")
)

func hasFFmpeg() bool  { return ffmpegPath != "" }
func hasFFprobe() bool { return ffprobePath != "" }

// Limites acima dos quais vale a pena recodificar (vídeo grande demais para
// streaming fluido no celular). Abaixo disso fazemos só o faststart.
const (
	maxHeight  = 800     // altura alvo máxima (~720p)
	maxFPS     = 31      // fps alvo máximo
	maxBitrate = 2500000 // ~2.5 Mbps
)

type videoProbe struct {
	Width, Height int
	FPS           float64
	BitRate       int
}

// optimizeVideo produz uma versão do vídeo pronta para streaming no celular:
//   - se o vídeo é grande demais (alta resolução/fps/bitrate), recodifica para
//     H.264 ~720p/30fps com bitrate baixo (redução enorme de tamanho);
//   - caso contrário, apenas move o moov atom para o início (faststart), sem
//     recodificar.
//
// Retorna o caminho de um novo arquivo temporário. Se o ffmpeg não estiver
// disponível ou algo falhar, retorna ("", false) e o chamador segue com o
// original.
func optimizeVideo(srcPath string) (string, bool) {
	if !hasFFmpeg() {
		return "", false
	}
	if needsReencode(srcPath) {
		if out, ok := reencode(srcPath); ok {
			return out, true
		}
		// se a recodificação falhar, ainda tenta o faststart barato
	}
	return faststartRemux(srcPath)
}

// needsReencode sonda o vídeo e decide se ele é grande o suficiente para
// justificar a recodificação. Na dúvida (sem ffprobe / erro), retorna true —
// é melhor recodificar um vídeo pesado do que servir 138 MB para um iPhone.
func needsReencode(srcPath string) bool {
	p, ok := probeVideo(srcPath)
	if !ok {
		return true
	}
	if p.Height > maxHeight || p.FPS > maxFPS+0.5 {
		return true
	}
	if p.BitRate > 0 && p.BitRate > maxBitrate {
		return true
	}
	return false
}

func probeVideo(srcPath string) (videoProbe, bool) {
	if !hasFFprobe() {
		return videoProbe{}, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, ffprobePath,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height,avg_frame_rate:format=bit_rate",
		"-of", "json",
		srcPath,
	)
	out, err := cmd.Output()
	if err != nil {
		return videoProbe{}, false
	}

	var parsed struct {
		Streams []struct {
			Width        int    `json:"width"`
			Height       int    `json:"height"`
			AvgFrameRate string `json:"avg_frame_rate"`
		} `json:"streams"`
		Format struct {
			BitRate string `json:"bit_rate"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &parsed); err != nil || len(parsed.Streams) == 0 {
		return videoProbe{}, false
	}

	pr := videoProbe{
		Width:  parsed.Streams[0].Width,
		Height: parsed.Streams[0].Height,
	}
	pr.FPS = parseFrameRate(parsed.Streams[0].AvgFrameRate)
	if br, err := strconv.Atoi(parsed.Format.BitRate); err == nil {
		pr.BitRate = br
	}
	return pr, true
}

// parseFrameRate converte "30000/1001" ou "60/1" em float. 0 se inválido.
func parseFrameRate(s string) float64 {
	for i := 0; i < len(s); i++ {
		if s[i] == '/' {
			num, err1 := strconv.ParseFloat(s[:i], 64)
			den, err2 := strconv.ParseFloat(s[i+1:], 64)
			if err1 != nil || err2 != nil || den == 0 {
				return 0
			}
			return num / den
		}
	}
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// reencode recodifica para H.264 ~720p/30fps, áudio AAC 128k, com faststart.
// Usa preset veryfast para não deixar o upload lento demais.
func reencode(srcPath string) (string, bool) {
	out, err := os.CreateTemp("", "fwlc-enc-*.mp4")
	if err != nil {
		return "", false
	}
	outPath := out.Name()
	_ = out.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, ffmpegPath,
		"-i", srcPath,
		// Cabe numa caixa 1280x1280 preservando a proporção; dimensões pares
		// (exigência do yuv420p); no máximo 30fps.
		"-vf", "scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
		"-c:v", "libx264",
		"-preset", "veryfast",
		"-crf", "26",
		"-profile:v", "high",
		"-level", "4.0",
		"-pix_fmt", "yuv420p",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ac", "2",
		"-movflags", "+faststart",
		"-map_metadata", "-1",
		"-y", outPath,
	)
	if err := cmd.Run(); err != nil {
		_ = os.Remove(outPath)
		return "", false
	}
	if info, err := os.Stat(outPath); err != nil || info.Size() == 0 {
		_ = os.Remove(outPath)
		return "", false
	}
	return outPath, true
}

// faststartRemux reescreve um MP4 movendo o átomo `moov` para o início do
// arquivo usando stream-copy (`-c copy`) — sem recodificar, rápido e sem perda.
func faststartRemux(srcPath string) (string, bool) {
	if !hasFFmpeg() {
		return "", false
	}

	out, err := os.CreateTemp("", "fwlc-opt-*.mp4")
	if err != nil {
		return "", false
	}
	outPath := out.Name()
	_ = out.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, ffmpegPath,
		"-i", srcPath,
		"-c", "copy",
		"-movflags", "+faststart",
		"-map_metadata", "-1",
		"-y", outPath,
	)
	if err := cmd.Run(); err != nil {
		_ = os.Remove(outPath)
		return "", false
	}
	if info, err := os.Stat(outPath); err != nil || info.Size() == 0 {
		_ = os.Remove(outPath)
		return "", false
	}
	return outPath, true
}

package services

import (
	"context"
	"os"
	"os/exec"
	"time"
)

// ffmpegAvailable é resolvido uma vez no start (LookPath é relativamente caro).
var ffmpegPath, _ = exec.LookPath("ffmpeg")

// hasFFmpeg indica se o binário ffmpeg está disponível no ambiente.
func hasFFmpeg() bool { return ffmpegPath != "" }

// faststartRemux reescreve um MP4 movendo o átomo `moov` para o início do
// arquivo (`-movflags +faststart`) usando stream-copy (`-c copy`) — sem
// recodificar, portanto rápido e sem perda de qualidade. Isso permite que o
// navegador (especialmente o iOS Safari) comece a tocar o vídeo imediatamente,
// em vez de ter que baixar o arquivo inteiro para achar o índice no final.
//
// Retorna o caminho de um novo arquivo temporário otimizado. Se o ffmpeg não
// estiver disponível ou a operação falhar, retorna ("", false) e o chamador
// deve seguir com o arquivo original.
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

	// -c copy: sem recodificar (rápido). -movflags +faststart: moov no início.
	// -map_metadata -1: remove metadados desnecessários. -y: sobrescreve.
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

	// Sanidade: arquivo de saída precisa existir e não estar vazio.
	if info, err := os.Stat(outPath); err != nil || info.Size() == 0 {
		_ = os.Remove(outPath)
		return "", false
	}

	return outPath, true
}

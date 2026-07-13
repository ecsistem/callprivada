package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/storage"
)

type VideoService struct {
	videos  domain.VideoRepository
	storage storage.FileStorage
}

func NewVideoService(videos domain.VideoRepository, store storage.FileStorage) *VideoService {
	return &VideoService{videos: videos, storage: store}
}

// CheckCreateLimit verifica se o usuário atingiu o limite de vídeos do plano.
func (s *VideoService) CheckCreateLimit(ctx context.Context, userID uuid.UUID, subSvc *SubscriptionService) error {
	if subSvc == nil {
		return nil
	}
	sub, err := subSvc.GetMySubscription(ctx, userID)
	if err != nil || sub == nil {
		return nil
	}
	plan, err := subSvc.GetPlan(ctx, sub.PlanID)
	if err != nil || plan == nil || plan.MaxVideos == 0 {
		return nil
	}
	count, err := s.videos.CountByUserID(ctx, userID)
	if err != nil {
		return nil
	}
	if count >= int64(plan.MaxVideos) {
		return domain.ErrPlanLimitReached
	}
	return nil
}

// Upload valida MIME real (magic bytes), otimiza o vídeo para streaming
// (faststart), envia para o storage e cria o registro.
// O body deve ser o io.Reader do multipart file.
func (s *VideoService) Upload(ctx context.Context, userID uuid.UUID, filename string, size int64, body io.Reader) (*domain.Video, error) {
	if size > domain.VideoMaxBytes {
		return nil, domain.ErrFileTooLarge
	}

	// Grava o upload em um arquivo temporário para (1) detectar o MIME real e
	// (2) permitir a otimização com ffmpeg, que precisa de acesso ao arquivo.
	tmp, err := os.CreateTemp("", "fwlc-upload-*")
	if err != nil {
		return nil, fmt.Errorf("cannot create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	written, err := io.Copy(tmp, io.LimitReader(body, domain.VideoMaxBytes+1))
	_ = tmp.Close()
	if err != nil {
		return nil, fmt.Errorf("cannot buffer upload: %w", err)
	}
	if written > domain.VideoMaxBytes {
		return nil, domain.ErrFileTooLarge
	}

	// Detecção real de MIME pelos magic bytes (primeiros 512 bytes).
	mimeType, err := sniffFileMIME(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read file: %w", err)
	}
	if !domain.AllowedVideoMIMEs[mimeType] {
		return nil, domain.ErrUnsupportedMIME
	}

	// Otimização: comprime vídeos grandes (~720p/30fps) e/ou move o moov atom
	// para o início (faststart) — streaming fluido e rápido no celular.
	uploadPath := tmpPath
	if mimeType == "video/mp4" {
		if optPath, ok := optimizeVideo(tmpPath); ok {
			defer os.Remove(optPath)
			uploadPath = optPath
		}
	}

	uploadSize := written
	if info, statErr := os.Stat(uploadPath); statErr == nil {
		uploadSize = info.Size()
	}

	key := fmt.Sprintf("videos/%s/%s", userID, uuid.New().String())

	video := &domain.Video{
		UserID:       userID,
		StorageKey:   key,
		OriginalName: filename,
		MimeType:     mimeType,
		SizeBytes:    uploadSize,
		Status:       domain.VideoStatusUploading,
	}

	if err := s.videos.Create(ctx, video); err != nil {
		return nil, err
	}

	f, err := os.Open(uploadPath)
	if err != nil {
		video.Status = domain.VideoStatusFailed
		_ = s.videos.Update(ctx, video)
		return nil, fmt.Errorf("cannot reopen file for upload: %w", err)
	}
	defer f.Close()

	if err := s.storage.Upload(ctx, key, f, mimeType); err != nil {
		video.Status = domain.VideoStatusFailed
		_ = s.videos.Update(ctx, video)
		return nil, fmt.Errorf("storage upload failed: %w", err)
	}

	video.Status = domain.VideoStatusReady
	if err := s.videos.Update(ctx, video); err != nil {
		return nil, err
	}

	return video, nil
}

// sniffFileMIME lê os primeiros 512 bytes de um arquivo e retorna o MIME real.
func sniffFileMIME(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	buf := make([]byte, 512)
	n, err := f.Read(buf)
	if err != nil && err != io.EOF {
		return "", err
	}
	return http.DetectContentType(buf[:n]), nil
}

// ReoptimizeResult descreve o resultado de reprocessar um vídeo existente.
type ReoptimizeResult struct {
	VideoID       uuid.UUID `json:"video_id"`
	Optimized     bool      `json:"optimized"`
	OldSizeBytes  int64     `json:"old_size_bytes"`
	NewSizeBytes  int64     `json:"new_size_bytes"`
	Reason        string    `json:"reason,omitempty"`
}

// Reoptimize baixa um vídeo já armazenado, roda a otimização (compressão +
// faststart) e regrava no mesmo storage key. Só substitui se o resultado for
// menor que o original. Usado para reprocessar vídeos enviados antes da
// otimização automática no upload.
func (s *VideoService) Reoptimize(ctx context.Context, userID, videoID uuid.UUID) (*ReoptimizeResult, error) {
	v, err := s.GetByID(ctx, userID, videoID)
	if err != nil {
		return nil, err
	}

	res := &ReoptimizeResult{VideoID: v.ID, OldSizeBytes: v.SizeBytes, NewSizeBytes: v.SizeBytes}

	if !hasFFmpeg() {
		res.Reason = "ffmpeg indisponível no servidor"
		return res, nil
	}
	if v.MimeType != "video/mp4" {
		res.Reason = "otimização suportada apenas para video/mp4"
		return res, nil
	}

	// Baixa o objeto para um arquivo temporário.
	rc, err := s.storage.Download(ctx, v.StorageKey)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	defer rc.Close()

	src, err := os.CreateTemp("", "fwlc-reopt-src-*.mp4")
	if err != nil {
		return nil, fmt.Errorf("cannot create temp: %w", err)
	}
	srcPath := src.Name()
	defer os.Remove(srcPath)
	if _, err := io.Copy(src, rc); err != nil {
		_ = src.Close()
		return nil, fmt.Errorf("cannot buffer download: %w", err)
	}
	_ = src.Close()

	optPath, ok := optimizeVideo(srcPath)
	if !ok {
		res.Reason = "vídeo já otimizado ou otimização não aplicável"
		return res, nil
	}
	defer os.Remove(optPath)

	info, err := os.Stat(optPath)
	if err != nil {
		return nil, err
	}
	// Só substitui se ficou menor (evita regravar sem ganho / com perda).
	if info.Size() >= v.SizeBytes {
		res.Reason = "resultado não ficou menor; original mantido"
		return res, nil
	}

	f, err := os.Open(optPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if err := s.storage.Upload(ctx, v.StorageKey, f, "video/mp4"); err != nil {
		return nil, fmt.Errorf("storage upload failed: %w", err)
	}

	v.SizeBytes = info.Size()
	if err := s.videos.Update(ctx, v); err != nil {
		return nil, err
	}

	res.Optimized = true
	res.NewSizeBytes = info.Size()
	return res, nil
}

// ReoptimizeAll reprocessa todos os vídeos de um usuário e retorna os resultados.
func (s *VideoService) ReoptimizeAll(ctx context.Context, userID uuid.UUID) ([]ReoptimizeResult, error) {
	vids, err := s.videos.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	results := make([]ReoptimizeResult, 0, len(vids))
	for i := range vids {
		r, err := s.Reoptimize(ctx, userID, vids[i].ID)
		if err != nil {
			results = append(results, ReoptimizeResult{VideoID: vids[i].ID, Reason: err.Error()})
			continue
		}
		results = append(results, *r)
	}
	return results, nil
}

func (s *VideoService) List(ctx context.Context, userID uuid.UUID) ([]domain.Video, error) {
	return s.videos.FindByUserID(ctx, userID)
}

func (s *VideoService) GetByID(ctx context.Context, userID, videoID uuid.UUID) (*domain.Video, error) {
	v, err := s.videos.FindByID(ctx, videoID)
	if err != nil {
		return nil, err
	}
	if v.UserID != userID {
		return nil, domain.ErrNotFound
	}
	return v, nil
}

// PresignURL retorna URL temporária de acesso (1h) para o vídeo.
func (s *VideoService) PresignURL(ctx context.Context, userID, videoID uuid.UUID) (string, error) {
	v, err := s.GetByID(ctx, userID, videoID)
	if err != nil {
		return "", err
	}
	if v.Status != domain.VideoStatusReady {
		return "", domain.ErrVideoNotReady
	}
	return s.storage.PublicURL(v.StorageKey), nil
}

func (s *VideoService) Delete(ctx context.Context, userID, videoID uuid.UUID) error {
	v, err := s.GetByID(ctx, userID, videoID)
	if err != nil {
		return err
	}
	_ = s.storage.Delete(ctx, v.StorageKey)
	return s.videos.Delete(ctx, videoID)
}

// bytesReader wraps a []byte as io.Reader (evita importar bytes no service).
type bytesReader struct {
	data []byte
	pos  int
}

func newBytesReader(data []byte) *bytesReader { return &bytesReader{data: data} }

func (r *bytesReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.data) {
		return 0, io.EOF
	}
	n := copy(p, r.data[r.pos:])
	r.pos += n
	return n, nil
}

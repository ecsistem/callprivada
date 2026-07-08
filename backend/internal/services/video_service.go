package services

import (
	"context"
	"fmt"
	"io"
	"net/http"

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

// Upload valida MIME real (magic bytes), faz upload para S3/MinIO e cria o registro.
// O body deve ser o io.Reader do multipart file.
func (s *VideoService) Upload(ctx context.Context, userID uuid.UUID, filename string, size int64, body io.Reader) (*domain.Video, error) {
	if size > domain.VideoMaxBytes {
		return nil, domain.ErrFileTooLarge
	}

	// Lê os primeiros 512 bytes para detecção real de MIME (magic bytes).
	sniff := make([]byte, 512)
	n, err := io.ReadFull(body, sniff)
	if err != nil && err != io.ErrUnexpectedEOF {
		return nil, fmt.Errorf("cannot read file: %w", err)
	}
	mime := http.DetectContentType(sniff[:n])

	if !domain.AllowedVideoMIMEs[mime] {
		return nil, domain.ErrUnsupportedMIME
	}

	key := fmt.Sprintf("videos/%s/%s", userID, uuid.New().String())

	// Recombina os bytes já lidos com o restante do body.
	combined := io.MultiReader(newBytesReader(sniff[:n]), body)

	video := &domain.Video{
		UserID:       userID,
		StorageKey:   key,
		OriginalName: filename,
		MimeType:     mime,
		SizeBytes:    size,
		Status:       domain.VideoStatusUploading,
	}

	if err := s.videos.Create(ctx, video); err != nil {
		return nil, err
	}

	if err := s.storage.Upload(ctx, key, combined, mime); err != nil {
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

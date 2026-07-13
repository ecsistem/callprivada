package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Config struct {
	Endpoint       string
	PublicEndpoint string // host:port acessível pelo browser (ex: localhost:9000)
	Region         string
	Bucket         string
	AccessKey      string
	SecretKey      string
	UseSSL         bool
}

type S3Client struct {
	client         *s3.Client
	presign        *s3.PresignClient
	up             *manager.Uploader
	bucket         string
	publicEndpoint string // host público para URLs permanentes (ex: storage.callprivada.online)
	useSSL         bool
}

func makeS3Client(endpoint, region, accessKey, secretKey string, useSSL bool) (*s3.Client, error) {
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, opts ...interface{}) (aws.Endpoint, error) {
		if endpoint != "" {
			return aws.Endpoint{
				URL:               fmt.Sprintf("%s://%s", scheme, endpoint),
				SigningRegion:     reg,
				HostnameImmutable: true,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})
	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		awsconfig.WithEndpointResolverWithOptions(resolver),
	)
	if err != nil {
		return nil, err
	}
	return s3.NewFromConfig(awsCfg, func(o *s3.Options) { o.UsePathStyle = true }), nil
}

func NewS3Client(cfg S3Config) (*S3Client, error) {
	// Cliente interno: usado para upload/delete (resolve minio:9000 dentro do Docker)
	internal, err := makeS3Client(cfg.Endpoint, cfg.Region, cfg.AccessKey, cfg.SecretKey, cfg.UseSSL)
	if err != nil {
		return nil, err
	}

	// Cliente público: usado apenas para presign; assina com o host que o browser acessa
	presignEndpoint := cfg.Endpoint
	if cfg.PublicEndpoint != "" {
		presignEndpoint = cfg.PublicEndpoint
	}
	pub, err := makeS3Client(presignEndpoint, cfg.Region, cfg.AccessKey, cfg.SecretKey, cfg.UseSSL)
	if err != nil {
		return nil, err
	}

	publicEndpoint := cfg.PublicEndpoint
	if publicEndpoint == "" {
		publicEndpoint = cfg.Endpoint
	}

	return &S3Client{
		client:         internal,
		presign:        s3.NewPresignClient(pub),
		up:             manager.NewUploader(internal, func(u *manager.Uploader) { u.PartSize = 10 * 1024 * 1024 }),
		bucket:         cfg.Bucket,
		publicEndpoint: publicEndpoint,
		useSSL:         cfg.UseSSL,
	}, nil
}

// Upload faz multipart upload de um reader para o bucket configurado.
func (s *S3Client) Upload(ctx context.Context, key string, body io.Reader, contentType string) error {
	_, err := s.up.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

// Download retorna o corpo de um objeto do bucket. O chamador deve fechar.
func (s *S3Client) Download(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// Delete remove um objeto do bucket.
func (s *S3Client) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

// PublicURL retorna uma URL permanente para objetos em buckets públicos.
func (s *S3Client) PublicURL(key string) string {
	scheme := "http"
	if s.useSSL {
		scheme = "https"
	}
	// Se o endpoint público não tem esquema, adiciona https por padrão para domínios reais.
	endpoint := s.publicEndpoint
	if len(endpoint) > 0 && endpoint[0] != 'h' {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, endpoint, s.bucket, key)
}

// PresignGet gera uma URL pré-assinada para download (GET) com TTL configurável.
// A URL é assinada com o endpoint público, válida diretamente no browser.
func (s *S3Client) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	req, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

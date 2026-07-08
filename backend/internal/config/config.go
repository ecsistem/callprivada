package config

import (
	"os"
)

// Config holds all environment-driven configuration for the application.
type Config struct {
	AppEnv      string
	HTTPPort    string
	DatabaseURL string
	RedisURL    string

	JWTSecret          string
	JWTAccessTTLMin    string
	JWTRefreshTTLHours string

	S3Endpoint       string
	S3PublicEndpoint string
	S3Region         string
	S3Bucket         string
	S3AccessKey      string
	S3SecretKey      string
	S3UseSSL         string

	AbacatePayAPIKey       string
	AbacatePayWebhookSecret string
	AbacatePayBaseURL      string

	PublicBaseURL    string
	WebhookBaseURL   string // sobrescreve PUBLIC_BASE_URL apenas para callbacks externos (ex: ngrok/webhook.cool em dev)

	StorageDriver    string // "s3" | "local"
	LocalStoragePath string // usado quando StorageDriver=="local"
}

func Load() *Config {
	return &Config{
		AppEnv:      getEnv("APP_ENV", "development"),
		HTTPPort:    getEnv("HTTP_PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", ""),

		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTAccessTTLMin:    getEnv("JWT_ACCESS_TTL_MIN", "15"),
		JWTRefreshTTLHours: getEnv("JWT_REFRESH_TTL_HOURS", "168"),

		S3Endpoint:       getEnv("S3_ENDPOINT", ""),
		S3PublicEndpoint: getEnv("S3_PUBLIC_ENDPOINT", ""),
		S3Region:         getEnv("S3_REGION", "us-east-1"),
		S3Bucket:         getEnv("S3_BUCKET", "fwlc"),
		S3AccessKey:      getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:      getEnv("S3_SECRET_KEY", ""),
		S3UseSSL:         getEnv("S3_USE_SSL", "false"),

		AbacatePayAPIKey:        getEnv("ABACATEPAY_API_KEY", ""),
		AbacatePayWebhookSecret: getEnv("ABACATEPAY_WEBHOOK_SECRET", ""),
		AbacatePayBaseURL:       getEnv("ABACATEPAY_BASE_URL", "https://api.abacatepay.com"),

		PublicBaseURL:  getEnv("PUBLIC_BASE_URL", "http://localhost:5173"),
		WebhookBaseURL: getEnv("WEBHOOK_BASE_URL", ""),

		StorageDriver:    getEnv("STORAGE_DRIVER", "s3"),
		LocalStoragePath: getEnv("LOCAL_STORAGE_PATH", "./uploads"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

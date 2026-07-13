package domain

import "context"

// Chaves de configuração global (tabela app_settings).
const (
	// SettingVideoCDNURL — base do domínio da CDN de vídeo, ex:
	// "https://cdn.callprivada.online". Vazio = usa a URL padrão do storage.
	SettingVideoCDNURL = "video_cdn_url"

	// SettingAbacatePayAPIKey — API key do AbacatePay (gateway de assinaturas da
	// plataforma). Vazio = usa a variável de ambiente ABACATEPAY_API_KEY.
	SettingAbacatePayAPIKey = "abacatepay_api_key"
)

// AppSettingsRepository persiste configurações globais chave/valor.
type AppSettingsRepository interface {
	Get(ctx context.Context, key string) (string, error)
	GetAll(ctx context.Context) (map[string]string, error)
	Set(ctx context.Context, key, value string) error
}

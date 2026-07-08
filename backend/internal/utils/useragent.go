package utils

import "strings"

// ParseUA extrai device_type, browser e OS de um User-Agent string.
// Implementação sem dependências externas — boa cobertura para 95% dos UAs reais.
func ParseUA(ua string) (deviceType, browser, os string) {
	ua = strings.ToLower(ua)

	// ── Device ──────────────────────────────────────────────────────────────
	switch {
	case strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet"):
		deviceType = "Tablet"
	case strings.Contains(ua, "mobile") || strings.Contains(ua, "android") ||
		strings.Contains(ua, "iphone") || strings.Contains(ua, "ipod"):
		deviceType = "Mobile"
	default:
		deviceType = "Desktop"
	}

	// ── Browser ─────────────────────────────────────────────────────────────
	switch {
	case strings.Contains(ua, "edg/") || strings.Contains(ua, "edge/"):
		browser = "Edge"
	case strings.Contains(ua, "opr/") || strings.Contains(ua, "opera"):
		browser = "Opera"
	case strings.Contains(ua, "samsungbrowser"):
		browser = "Samsung"
	case strings.Contains(ua, "firefox") || strings.Contains(ua, "fxios"):
		browser = "Firefox"
	case strings.Contains(ua, "chrome") || strings.Contains(ua, "crios"):
		browser = "Chrome"
	case strings.Contains(ua, "safari"):
		browser = "Safari"
	default:
		browser = "Other"
	}

	// ── OS ──────────────────────────────────────────────────────────────────
	switch {
	case strings.Contains(ua, "iphone"):
		os = "iOS"
	case strings.Contains(ua, "ipad"):
		os = "iPadOS"
	case strings.Contains(ua, "android"):
		os = "Android"
	case strings.Contains(ua, "windows"):
		os = "Windows"
	case strings.Contains(ua, "mac os x") || strings.Contains(ua, "macos"):
		os = "macOS"
	case strings.Contains(ua, "linux"):
		os = "Linux"
	default:
		os = "Other"
	}

	return deviceType, browser, os
}

// ClientIP extrai o IP real do request, respeitando X-Forwarded-For do proxy/nginx.
func ClientIP(remoteAddr, xForwardedFor, xRealIP string) string {
	if xRealIP != "" {
		return strings.TrimSpace(strings.Split(xRealIP, ",")[0])
	}
	if xForwardedFor != "" {
		return strings.TrimSpace(strings.Split(xForwardedFor, ",")[0])
	}
	// remoteAddr pode ter formato "ip:port"
	if idx := strings.LastIndex(remoteAddr, ":"); idx > 0 {
		return remoteAddr[:idx]
	}
	return remoteAddr
}

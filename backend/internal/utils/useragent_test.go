package utils_test

import (
	"testing"

	"github.com/callprivada/fwlc-backend/internal/utils"
)

func TestParseUA_Desktop_Chrome(t *testing.T) {
	ua := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
	device, browser, os := utils.ParseUA(ua)
	if device != "Desktop" {
		t.Errorf("device = %q, want Desktop", device)
	}
	if browser != "Chrome" {
		t.Errorf("browser = %q, want Chrome", browser)
	}
	if os != "Windows" {
		t.Errorf("os = %q, want Windows", os)
	}
}

func TestParseUA_Mobile_Safari_iOS(t *testing.T) {
	ua := "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
	device, browser, os := utils.ParseUA(ua)
	if device != "Mobile" {
		t.Errorf("device = %q, want Mobile", device)
	}
	if browser != "Safari" {
		t.Errorf("browser = %q, want Safari", browser)
	}
	if os != "iOS" {
		t.Errorf("os = %q, want iOS", os)
	}
}

func TestParseUA_Tablet(t *testing.T) {
	ua := "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
	device, _, _ := utils.ParseUA(ua)
	if device != "Tablet" {
		t.Errorf("device = %q, want Tablet", device)
	}
}

func TestParseUA_Firefox_Linux(t *testing.T) {
	ua := "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0"
	device, browser, os := utils.ParseUA(ua)
	if device != "Desktop" {
		t.Errorf("device = %q, want Desktop", device)
	}
	if browser != "Firefox" {
		t.Errorf("browser = %q, want Firefox", browser)
	}
	if os != "Linux" {
		t.Errorf("os = %q, want Linux", os)
	}
}

func TestParseUA_Edge(t *testing.T) {
	ua := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
	_, browser, _ := utils.ParseUA(ua)
	if browser != "Edge" {
		t.Errorf("browser = %q, want Edge", browser)
	}
}

func TestClientIP_XRealIP(t *testing.T) {
	ip := utils.ClientIP("10.0.0.1:80", "192.168.1.1", "203.0.113.5")
	if ip != "203.0.113.5" {
		t.Errorf("ClientIP = %q, want 203.0.113.5", ip)
	}
}

func TestClientIP_XForwardedFor(t *testing.T) {
	ip := utils.ClientIP("10.0.0.1:80", "203.0.113.5, 10.0.0.2", "")
	if ip != "203.0.113.5" {
		t.Errorf("ClientIP = %q, want 203.0.113.5", ip)
	}
}

func TestClientIP_RemoteAddr(t *testing.T) {
	ip := utils.ClientIP("203.0.113.5:54321", "", "")
	if ip != "203.0.113.5" {
		t.Errorf("ClientIP = %q, want 203.0.113.5", ip)
	}
}

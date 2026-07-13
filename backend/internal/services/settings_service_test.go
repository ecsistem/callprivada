package services

import "testing"

func TestNormalizeCDNBase(t *testing.T) {
	cases := map[string]string{
		"":                              "",
		"   ":                           "",
		"cdn.callprivada.online":        "https://cdn.callprivada.online",
		"https://cdn.callprivada.online": "https://cdn.callprivada.online",
		"https://cdn.exemplo.com/":      "https://cdn.exemplo.com",
		"http://cdn.local:9000/pref/":   "http://cdn.local:9000/pref",
	}
	for in, want := range cases {
		if got := normalizeCDNBase(in); got != want {
			t.Errorf("normalizeCDNBase(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestRewriteToCDN(t *testing.T) {
	const src = "https://storage.callprivada.online/fwlc/videos/74003b30/afa686fc"

	cases := []struct {
		cdn  string
		want string
	}{
		{"", src}, // sem CDN → original
		{"https://cdn.callprivada.online", "https://cdn.callprivada.online/fwlc/videos/74003b30/afa686fc"},
		{"https://cdn.exemplo.com/pref", "https://cdn.exemplo.com/pref/fwlc/videos/74003b30/afa686fc"},
	}
	for _, tc := range cases {
		if got := rewriteToCDN(src, tc.cdn); got != tc.want {
			t.Errorf("rewriteToCDN(src, %q) = %q, want %q", tc.cdn, got, tc.want)
		}
	}
}

package abacatepay

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultBaseURL = "https://api.abacatepay.com"

type Client struct {
	keyFn   func() string
	baseURL string
	http    *http.Client
}

func NewClient(apiKey, baseURL string) *Client {
	return NewClientWithKeyFunc(func() string { return apiKey }, baseURL)
}

// NewClientWithKeyFunc resolve a API key dinamicamente a cada requisição —
// permite trocar a credencial em runtime (ex: configurada no painel admin).
func NewClientWithKeyFunc(keyFn func() string, baseURL string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	return &Client{
		keyFn:   keyFn,
		baseURL: baseURL,
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

// Ping valida a credencial atual contra a API do AbacatePay (endpoint de
// leitura). Retorna erro se a chave estiver ausente, inválida ou inativa.
func (c *Client) Ping() error {
	if c.keyFn() == "" {
		return fmt.Errorf("abacatepay: nenhuma API key configurada")
	}
	return c.do("GET", "/v1/billing/list", nil, nil)
}

func (c *Client) do(method, path string, body interface{}, out interface{}) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.keyFn())
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("abacatepay: HTTP %d — %s", resp.StatusCode, string(raw))
	}

	if out != nil {
		return json.Unmarshal(raw, out)
	}
	return nil
}

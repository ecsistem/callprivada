package abacatepay

import "github.com/callprivada/fwlc-backend/internal/domain"

type createSubscriptionRequest struct {
	ProductID string   `json:"productId"`
	Customer  customer `json:"customer"`
}

type customer struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	TaxID     string `json:"taxId,omitempty"`
	Cellphone string `json:"cellphone,omitempty"`
}

type createSubscriptionResponse struct {
	Data struct {
		ID          string `json:"id"`
		Status      string `json:"status"`
		CheckoutURL string `json:"url"`
	} `json:"data"`
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type cancelSubscriptionResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (c *Client) CreateSubscription(userID, planID, productID, customerName, customerEmail, customerTaxID string) (*domain.GatewaySubscription, error) {
	payload := createSubscriptionRequest{
		ProductID: productID,
		Customer: customer{
			Name:  customerName,
			Email: customerEmail,
			TaxID: customerTaxID,
		},
	}
	var resp createSubscriptionResponse
	if err := c.do("POST", "/v2/subscriptions/create", payload, &resp); err != nil {
		return nil, err
	}
	return &domain.GatewaySubscription{
		GatewayID:   resp.Data.ID,
		Status:      resp.Data.Status,
		CheckoutURL: resp.Data.CheckoutURL,
	}, nil
}

func (c *Client) CancelSubscription(gatewaySubscriptionID string) error {
	payload := map[string]string{"id": gatewaySubscriptionID}
	var resp cancelSubscriptionResponse
	return c.do("POST", "/v2/subscriptions/cancel", payload, &resp)
}

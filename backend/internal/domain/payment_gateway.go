package domain

// PaymentGateway abstrai o provedor de pagamento (AbacatePay hoje).
// Services dependem desta interface; nunca do SDK concreto.
type PaymentGateway interface {
	CreateSubscription(userID, planID, productID, customerName, customerEmail, customerTaxID string) (*GatewaySubscription, error)
	CancelSubscription(gatewaySubscriptionID string) error
}

type GatewaySubscription struct {
	GatewayID string
	Status    string
	CheckoutURL string
}

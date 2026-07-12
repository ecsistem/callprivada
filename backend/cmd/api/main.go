package main

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/callprivada/fwlc-backend/internal/abacatepay"
	"github.com/callprivada/fwlc-backend/internal/config"
	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/handlers"
	"github.com/callprivada/fwlc-backend/internal/middlewares"
	"github.com/callprivada/fwlc-backend/internal/repositories"
	"github.com/callprivada/fwlc-backend/internal/services"
	"github.com/callprivada/fwlc-backend/internal/storage"
	"github.com/callprivada/fwlc-backend/internal/utils"
	ws "github.com/callprivada/fwlc-backend/internal/ws"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := storage.RunMigrations(cfg.DatabaseURL, "file:///app/migrations"); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	db, err := storage.NewPostgresConnection(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Redis (opcional — rate limiting degrada graciosamente se indisponível).
	var rdb *redis.Client
	if cfg.RedisURL != "" {
		opt, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			log.Fatalf("invalid REDIS_URL: %v", err)
		}
		rdb = redis.NewClient(opt)
		log.Printf("redis connected: %s", cfg.RedisURL)
	} else {
		log.Printf("REDIS_URL not set — rate limiting disabled")
	}

	// Repositories.
	userRepo := repositories.NewUserRepository(db)

	// Seed do usuário admin padrão (idempotente — só cria se não existir).
	seedAdminUser(userRepo)
	sessionRepo := repositories.NewSessionRepository(db)
	resetTokenRepo := repositories.NewPasswordResetTokenRepository(db)
	planRepo := repositories.NewPlanRepository(db)
	subRepo := repositories.NewSubscriptionRepository(db)
	videoRepo := repositories.NewVideoRepository(db)
	callRepo := repositories.NewCallRepository(db)
	callEventRepo := repositories.NewCallEventRepository(db)
	paymentConfigRepo := repositories.NewPaymentConfigRepository(db)
	billingTxnRepo := repositories.NewBillingTransactionRepository(db)
	visitRepo := repositories.NewVisitRepository(db)
	auditLogRepo := repositories.NewAuditLogRepository(db)
	presellRepo := repositories.NewPresellRepository(db)
	trackingRepo := repositories.NewTrackingRepository(db)

	// Services.
	accessTTLMin, _ := strconv.Atoi(cfg.JWTAccessTTLMin)
	refreshTTLHours, _ := strconv.Atoi(cfg.JWTRefreshTTLHours)
	jwtService := services.NewJWTService(cfg.JWTSecret, time.Duration(accessTTLMin)*time.Minute)
	authService := services.NewAuthService(userRepo, sessionRepo, resetTokenRepo, jwtService, time.Duration(refreshTTLHours)*time.Hour)
	userService := services.NewUserService(userRepo, sessionRepo)

	var fileStore storage.FileStorage
	if cfg.StorageDriver == "local" {
		localStore, err := storage.NewLocalStorage(cfg.LocalStoragePath, cfg.PublicBaseURL, cfg.JWTSecret)
		if err != nil {
			log.Fatalf("failed to init local storage: %v", err)
		}
		fileStore = localStore
		log.Printf("storage driver: local (%s)", cfg.LocalStoragePath)
	} else {
		useSSL, _ := strconv.ParseBool(cfg.S3UseSSL)
		s3Client, err := storage.NewS3Client(storage.S3Config{
			Endpoint:       cfg.S3Endpoint,
			PublicEndpoint: cfg.S3PublicEndpoint,
			Region:         cfg.S3Region,
			Bucket:         cfg.S3Bucket,
			AccessKey:      cfg.S3AccessKey,
			SecretKey:      cfg.S3SecretKey,
			UseSSL:         useSSL,
		})
		if err != nil {
			log.Fatalf("failed to init S3 client: %v", err)
		}
		fileStore = s3Client
		log.Printf("storage driver: s3 (endpoint=%s bucket=%s)", cfg.S3Endpoint, cfg.S3Bucket)
	}

	// WebSocket hub.
	hub := ws.NewHub()
	go hub.Run()

	abacateClient := abacatepay.NewClient(cfg.AbacatePayAPIKey, cfg.AbacatePayBaseURL)
	subService := services.NewSubscriptionService(planRepo, subRepo, userRepo, abacateClient)
	videoService := services.NewVideoService(videoRepo, fileStore)
	callService := services.NewCallService(callRepo, videoRepo, callEventRepo, fileStore, paymentConfigRepo)
	callEventService := services.NewCallEventService(callEventRepo, callRepo)
	visitService := services.NewVisitService(visitRepo, callRepo)
	dashboardService := services.NewDashboardService(callRepo, subRepo, planRepo, visitRepo)
	paymentConfigService := services.NewPaymentConfigService(paymentConfigRepo)
	webhookBase := cfg.WebhookBaseURL
	if webhookBase == "" {
		webhookBase = cfg.PublicBaseURL
	}
	billingService := services.NewBillingService(callRepo, paymentConfigRepo, billingTxnRepo, webhookBase)
	adminService := services.NewAdminService(userRepo, subRepo, callRepo, auditLogRepo, planRepo)
	presellService := services.NewPresellService(presellRepo, fileStore)
	trackingService := services.NewTrackingService(trackingRepo)

	// Handlers.
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	subHandler := handlers.NewSubscriptionHandler(subService)
	webhookHandler := handlers.NewWebhookHandler(subService, cfg.AbacatePayWebhookSecret)
	videoHandler := handlers.NewVideoHandler(videoService, subService)
	callHandler := handlers.NewCallHandler(callService, trackingService, subService)
	callEventHandler := handlers.NewCallEventHandler(callEventService)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService)
	paymentConfigHandler := handlers.NewPaymentConfigHandler(paymentConfigService)
	billingHandler := handlers.NewBillingHandler(billingService, hub)
	visitHandler := handlers.NewVisitHandler(visitService, hub)
	wsHandler := handlers.NewWSHandler(hub, jwtService)
	adminHandler := handlers.NewAdminHandler(adminService, jwtService)
	presellHandler := handlers.NewPresellHandler(presellService, trackingService, subService)
	trackingHandler := handlers.NewTrackingHandler(trackingService)

	r := gin.Default()
	r.Use(middlewares.SecurityHeaders())
	r.Use(middlewares.CORS(cfg.PublicBaseURL))

	// Rate limit global por IP (500 req/min) — ativo apenas se Redis configurado.
	if rdb != nil {
		r.Use(middlewares.RateLimiter(rdb, 500, time.Minute, middlewares.ByIP))
	}

	// WebSocket — token via query string (?token=...) para compatibilidade com browsers.
	r.GET("/ws/dashboard", wsHandler.Dashboard)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")

	// Auth — rate limit por IP para frear brute-force (60 req/min é suficiente para uso normal).
	auth := api.Group("/auth")
	if rdb != nil {
		auth.Use(middlewares.RateLimiter(rdb, 60, time.Minute, middlewares.ByIP))
	}
	auth.POST("/register", authHandler.Register)
	auth.POST("/login", authHandler.Login)
	auth.POST("/refresh", authHandler.Refresh)
	auth.POST("/logout", authHandler.Logout)
	auth.POST("/forgot-password", authHandler.ForgotPassword)
	auth.POST("/reset-password", authHandler.ResetPassword)

	// Users (autenticado).
	users := api.Group("/users")
	users.Use(middlewares.RequireAuth(jwtService))
	users.GET("/me", userHandler.Me)
	users.PUT("/me", userHandler.UpdateMe)
	users.DELETE("/me", userHandler.DeleteMe)

	// Plans (público).
	api.GET("/plans", subHandler.ListPlans)

	// Subscriptions (autenticado).
	subs := api.Group("/subscriptions")
	subs.Use(middlewares.RequireAuth(jwtService))
	subs.POST("/checkout", subHandler.Checkout)
	subs.GET("/me", subHandler.GetMy)
	subs.POST("/cancel", subHandler.Cancel)

	// Calls (autenticado, requer assinatura).
	callsGroup := api.Group("/calls")
	callsGroup.Use(middlewares.RequireAuth(jwtService))
	callsGroup.Use(middlewares.RequireSubscription(subService))
	callsGroup.POST("", callHandler.Create)
	callsGroup.GET("", callHandler.List)
	callsGroup.GET("/:id", callHandler.Get)
	callsGroup.PUT("/:id", callHandler.Update)
	callsGroup.DELETE("/:id", callHandler.Delete)
	callsGroup.POST("/:id/image/:kind", callHandler.UploadImage)
	callsGroup.GET("/:id/events", callEventHandler.List)
	callsGroup.POST("/:id/events", callEventHandler.Create)
	callsGroup.GET("/:id/analytics", visitHandler.Analytics)
	callsGroup.GET("/:id/presells", presellHandler.GetByCallID)

	// Events (autenticado, rotas standalone para update/delete).
	eventsGroup := api.Group("/events")
	eventsGroup.Use(middlewares.RequireAuth(jwtService))
	eventsGroup.PUT("/:id", callEventHandler.Update)
	eventsGroup.DELETE("/:id", callEventHandler.Delete)

	// Public (sem auth) — rate limit generoso por IP (300/min cobre updateWatched + eventos + PIX).
	public := api.Group("/public")
	if rdb != nil {
		public.Use(middlewares.RateLimiter(rdb, 300, time.Minute, middlewares.ByIP))
	}
	public.GET("/calls/:slug", callHandler.GetPublic)
	public.GET("/presell/:slug", presellHandler.GetPublic)
	public.POST("/calls/:slug/billing/pix", billingHandler.CreatePIX)
	public.POST("/calls/:slug/billing/waymb", billingHandler.CreateWayMBPayment)
	public.GET("/billing/transactions/:id/status", billingHandler.GetPixStatus)
	public.GET("/billing/transactions/:id/waymb-status", billingHandler.GetWayMBStatus)
	public.POST("/calls/:slug/visits", visitHandler.Track)
	public.PATCH("/visits/:visit_id", visitHandler.UpdateWatched)
	public.POST("/presell/:slug/cta-click", presellHandler.CTAClick)

	// Settings (autenticado).
	settings := api.Group("/settings")
	settings.Use(middlewares.RequireAuth(jwtService))
	settings.GET("/payment", paymentConfigHandler.Get)
	settings.PUT("/payment", paymentConfigHandler.Save)
	settings.GET("/tracking", trackingHandler.Get)
	settings.PUT("/tracking", trackingHandler.Save)

	// Videos (autenticado, requer assinatura).
	videos := api.Group("/videos")
	videos.Use(middlewares.RequireAuth(jwtService))
	videos.Use(middlewares.RequireSubscription(subService))
	videos.POST("", videoHandler.Upload)
	videos.GET("", videoHandler.List)
	videos.GET("/:id", videoHandler.Get)
	videos.GET("/:id/url", videoHandler.PresignURL)
	videos.DELETE("/:id", videoHandler.Delete)

	// Presell (autenticado, requer assinatura).
	presellGroup := api.Group("/presell")
	presellGroup.Use(middlewares.RequireAuth(jwtService))
	presellGroup.Use(middlewares.RequireSubscription(subService))
	presellGroup.POST("", presellHandler.Create)
	presellGroup.GET("", presellHandler.List)
	presellGroup.GET("/:id", presellHandler.Get)
	presellGroup.PUT("/:id", presellHandler.Update)
	presellGroup.DELETE("/:id", presellHandler.Delete)
	presellGroup.POST("/:id/image", presellHandler.UploadImage)

	// Dashboard (autenticado).
	dashboardGroup := api.Group("/dashboard")
	dashboardGroup.Use(middlewares.RequireAuth(jwtService))
	dashboardGroup.GET("/summary", dashboardHandler.Summary)

	// Billing stats (autenticado).
	billingAuth := api.Group("/billing")
	billingAuth.Use(middlewares.RequireAuth(jwtService))
	billingAuth.GET("/stats", billingHandler.GetPaymentStats)

	// Admin (RequireAuth + RequireAdmin).
	adminGroup := api.Group("/admin")
	adminGroup.Use(middlewares.RequireAuth(jwtService))
	adminGroup.Use(middlewares.RequireAdmin())
	adminGroup.GET("/stats", adminHandler.Stats)
	adminGroup.GET("/users", adminHandler.ListUsers)
	adminGroup.PUT("/users/:id/block", adminHandler.BlockUser)
	adminGroup.PUT("/users/:id/unblock", adminHandler.UnblockUser)
	adminGroup.DELETE("/users/:id", adminHandler.DeleteUser)
	adminGroup.GET("/subscriptions", adminHandler.ListSubscriptions)
	adminGroup.DELETE("/subscriptions/:id", adminHandler.CancelSubscription)
	adminGroup.GET("/calls", adminHandler.ListCalls)
	adminGroup.DELETE("/calls/:id", adminHandler.DeleteCall)
	adminGroup.GET("/audit-logs", adminHandler.ListAuditLogs)
	adminGroup.POST("/users", adminHandler.CreateUser)
	adminGroup.POST("/users/:id/assign-plan", adminHandler.AssignPlan)
	adminGroup.POST("/users/:id/impersonate", adminHandler.ImpersonateUser)
	adminGroup.PUT("/users/:id/password", adminHandler.ChangeUserPassword)
	adminGroup.GET("/plans", subHandler.ListAllPlans)
	adminGroup.POST("/plans", subHandler.CreatePlan)
	adminGroup.PUT("/plans/:id", subHandler.UpdatePlan)
	adminGroup.PUT("/plans/:id/limits", subHandler.UpdatePlanLimits)
	adminGroup.DELETE("/plans/:id", subHandler.DeletePlan)

	// Webhooks (sem JWT).
	webhooks := api.Group("/webhooks")
	webhooks.POST("/abacatepay", webhookHandler.AbacatePay)
	webhooks.POST("/zuckpay", billingHandler.ZuckPayWebhook)
	webhooks.POST("/waymb", billingHandler.WayMBWebhook)

	// Rota de arquivos locais — ativa apenas quando STORAGE_DRIVER=local.
	if cfg.StorageDriver == "local" {
		localStore := fileStore.(*storage.LocalStorage)
		fileHandler := handlers.NewFileHandler(localStore)
		r.GET("/files/*key", fileHandler.Serve)
		log.Printf("local file serving enabled at /files/*")
	}

	log.Printf("fwlc-backend listening on :%s (env=%s)", cfg.HTTPPort, cfg.AppEnv)
	if err := r.Run(":" + cfg.HTTPPort); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

// seedAdminUser cria o usuário admin padrão caso ainda não exista.
// Idempotente: se o e-mail já estiver cadastrado, não faz nada.
func seedAdminUser(userRepo domain.UserRepository) {
	const adminEmail = "contato@edsoncosta.online"
	const adminPassword = "senha123"

	ctx := context.Background()

	existing, err := userRepo.FindByEmail(ctx, adminEmail)
	if err == nil && existing != nil {
		log.Printf("seed: admin user already exists (%s)", adminEmail)
		return
	}

	hash, err := utils.HashPassword(adminPassword)
	if err != nil {
		log.Printf("seed: failed to hash admin password: %v", err)
		return
	}

	admin := &domain.User{
		ID:           uuid.New(),
		Name:         "Admin",
		Email:        adminEmail,
		PasswordHash: hash,
		Role:         domain.RoleAdmin,
	}

	if err := userRepo.Create(ctx, admin); err != nil {
		log.Printf("seed: failed to create admin user: %v", err)
		return
	}

	log.Printf("seed: admin user created (%s)", adminEmail)
}

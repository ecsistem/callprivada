package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/callprivada/fwlc-backend/internal/domain"
	"github.com/callprivada/fwlc-backend/internal/services"
)

type PresellHandler struct {
	svc      *services.PresellService
	tracking *services.TrackingService
	subs     *services.SubscriptionService
}

func NewPresellHandler(svc *services.PresellService, tracking *services.TrackingService, subs *services.SubscriptionService) *PresellHandler {
	return &PresellHandler{svc: svc, tracking: tracking, subs: subs}
}

// ---- DTOs ----

type presellCommentDTO struct {
	Name        string `json:"name"`
	AvatarEmoji string `json:"avatar_emoji,omitempty"`
	Text        string `json:"text"`
	Time        string `json:"time,omitempty"`
	Likes       int    `json:"likes,omitempty"`
}

type presellConfigDTO struct {
	// Visual
	BgColor    string `json:"bg_color"`
	TextColor  string `json:"text_color"`
	BgImageURL string `json:"bg_image_url,omitempty"`
	// Header
	AvatarURL   string `json:"avatar_url,omitempty"`
	Name        string `json:"name"`
	Badge       string `json:"badge,omitempty"`
	Headline    string `json:"headline"`
	Subheadline string `json:"subheadline,omitempty"`
	// Slots
	ShowSlots        bool     `json:"show_slots"`
	SlotLabels       []string `json:"slot_labels,omitempty"`
	SlotAvailability []bool   `json:"slot_availability,omitempty"`
	UseRealTime      bool     `json:"use_real_time,omitempty"`
	// Social proof
	ShowViewerCount bool `json:"show_viewer_count,omitempty"`
	ViewerCountBase int  `json:"viewer_count_base,omitempty"`
	// Countdown
	ShowCountdown    bool `json:"show_countdown,omitempty"`
	CountdownSeconds int  `json:"countdown_seconds,omitempty"`
	// Location
	LocationLabel string `json:"location_label,omitempty"`
	LocationCity  string `json:"location_city,omitempty"`
	// Video
	VideoURL       string `json:"video_url,omitempty"`
	VideoPosterURL string `json:"video_poster_url,omitempty"`
	// Comments
	ShowComments bool                 `json:"show_comments,omitempty"`
	Comments     []presellCommentDTO  `json:"comments,omitempty"`
	// CTA
	CTAText      string `json:"cta_text"`
	CTAColor     string `json:"cta_color"`
	RedirectURL  string `json:"redirect_url"`
	DownsellSlug string `json:"downsell_slug,omitempty"`
	// Downsell — bloco de preço/desconto
	OriginalPriceLabel   string `json:"original_price_label,omitempty"`
	DiscountedPriceLabel string `json:"discounted_price_label,omitempty"`
	DiscountBadge        string `json:"discount_badge,omitempty"`
	// Textos avançados customizados
	ExtraTexts map[string]string `json:"extra_texts,omitempty"`
}

type presellDTO struct {
	ID           string           `json:"id"`
	CallID       *string          `json:"call_id,omitempty"`
	Slug         string           `json:"slug"`
	Type         string           `json:"type"`
	TemplateSlug string           `json:"template_slug"`
	Config       presellConfigDTO `json:"config"`
	CTAClicks    int              `json:"cta_clicks"`
	CreatedAt    string           `json:"created_at"`
	UpdatedAt    string           `json:"updated_at"`
}

func commentsToDTO(cs []domain.PresellComment) []presellCommentDTO {
	if len(cs) == 0 {
		return nil
	}
	out := make([]presellCommentDTO, len(cs))
	for i, c := range cs {
		out[i] = presellCommentDTO{Name: c.Name, AvatarEmoji: c.AvatarEmoji, Text: c.Text, Time: c.Time, Likes: c.Likes}
	}
	return out
}

func commentsFromDTO(ds []presellCommentDTO) []domain.PresellComment {
	if len(ds) == 0 {
		return nil
	}
	out := make([]domain.PresellComment, len(ds))
	for i, d := range ds {
		out[i] = domain.PresellComment{Name: d.Name, AvatarEmoji: d.AvatarEmoji, Text: d.Text, Time: d.Time, Likes: d.Likes}
	}
	return out
}

func toPresellDTO(p *domain.PresellPage) presellDTO {
	dto := presellDTO{
		ID:           p.ID.String(),
		Slug:         p.Slug,
		Type:         p.Type,
		TemplateSlug: p.TemplateSlug,
		Config: presellConfigDTO{
			BgColor:          p.Config.BgColor,
			TextColor:        p.Config.TextColor,
			BgImageURL:       p.Config.BgImageURL,
			AvatarURL:        p.Config.AvatarURL,
			Name:             p.Config.Name,
			Badge:            p.Config.Badge,
			Headline:         p.Config.Headline,
			Subheadline:      p.Config.Subheadline,
			ShowSlots:        p.Config.ShowSlots,
			SlotLabels:       p.Config.SlotLabels,
			SlotAvailability: p.Config.SlotAvailability,
			UseRealTime:      p.Config.UseRealTime,
			ShowViewerCount:  p.Config.ShowViewerCount,
			ViewerCountBase:  p.Config.ViewerCountBase,
			ShowCountdown:    p.Config.ShowCountdown,
			CountdownSeconds: p.Config.CountdownSeconds,
			LocationLabel:    p.Config.LocationLabel,
			LocationCity:     p.Config.LocationCity,
			VideoURL:         p.Config.VideoURL,
			VideoPosterURL:   p.Config.VideoPosterURL,
			ShowComments:     p.Config.ShowComments,
			Comments:         commentsToDTO(p.Config.Comments),
			CTAText:          p.Config.CTAText,
			CTAColor:         p.Config.CTAColor,
			RedirectURL:      p.Config.RedirectURL,
			DownsellSlug:     p.Config.DownsellSlug,
			OriginalPriceLabel:   p.Config.OriginalPriceLabel,
			DiscountedPriceLabel: p.Config.DiscountedPriceLabel,
			DiscountBadge:        p.Config.DiscountBadge,
			ExtraTexts:           p.Config.ExtraTexts,
		},
		CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	dto.CTAClicks = p.CTAClicks
	if p.CallID != nil {
		s := p.CallID.String()
		dto.CallID = &s
	}
	return dto
}

type upsertPresellRequest struct {
	CallID       string           `json:"call_id"`
	Type         string           `json:"type"`
	TemplateSlug string           `json:"template_slug" binding:"required"`
	Config       presellConfigDTO `json:"config"        binding:"required"`
}

func configFromDTO(dto presellConfigDTO) domain.PresellConfig {
	return domain.PresellConfig{
		BgColor:          dto.BgColor,
		TextColor:        dto.TextColor,
		BgImageURL:       dto.BgImageURL,
		AvatarURL:        dto.AvatarURL,
		Name:             dto.Name,
		Badge:            dto.Badge,
		Headline:         dto.Headline,
		Subheadline:      dto.Subheadline,
		ShowSlots:        dto.ShowSlots,
		SlotLabels:       dto.SlotLabels,
		SlotAvailability: dto.SlotAvailability,
		UseRealTime:      dto.UseRealTime,
		ShowViewerCount:  dto.ShowViewerCount,
		ViewerCountBase:  dto.ViewerCountBase,
		ShowCountdown:    dto.ShowCountdown,
		CountdownSeconds: dto.CountdownSeconds,
		LocationLabel:    dto.LocationLabel,
		LocationCity:     dto.LocationCity,
		VideoURL:         dto.VideoURL,
		VideoPosterURL:   dto.VideoPosterURL,
		ShowComments:     dto.ShowComments,
		Comments:         commentsFromDTO(dto.Comments),
		CTAText:          dto.CTAText,
		CTAColor:         dto.CTAColor,
		RedirectURL:      dto.RedirectURL,
		DownsellSlug:     dto.DownsellSlug,
		OriginalPriceLabel:   dto.OriginalPriceLabel,
		DiscountedPriceLabel: dto.DiscountedPriceLabel,
		DiscountBadge:        dto.DiscountBadge,
		ExtraTexts:           dto.ExtraTexts,
	}
}

// ---- Handlers ----

func (h *PresellHandler) Create(c *gin.Context) {
	uid := mustUserID(c)

	var req upsertPresellRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	in := services.CreatePresellInput{
		Type:         req.Type,
		TemplateSlug: req.TemplateSlug,
		Config:       configFromDTO(req.Config),
	}
	if req.CallID != "" {
		id, err := uuid.Parse(req.CallID)
		if err == nil {
			in.CallID = &id
		}
	}

	if err := h.svc.CheckCreateLimit(c.Request.Context(), uid, h.subs); err != nil {
		respondError(c, err)
		return
	}

	p, err := h.svc.Create(c.Request.Context(), uid, in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": toPresellDTO(p)})
}

func (h *PresellHandler) List(c *gin.Context) {
	uid := mustUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	typeFilter := c.Query("type")
	pages, total, err := h.svc.List(c.Request.Context(), uid, typeFilter, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}

	dtos := make([]presellDTO, len(pages))
	for i, p := range pages {
		dtos[i] = toPresellDTO(&p)
	}
	c.JSON(http.StatusOK, gin.H{"data": dtos, "total": total, "page": page, "per_page": perPage})
}

func (h *PresellHandler) Get(c *gin.Context) {
	uid := mustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	p, err := h.svc.GetByID(c.Request.Context(), uid, id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": toPresellDTO(p)})
}

func (h *PresellHandler) Update(c *gin.Context) {
	uid := mustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	var req upsertPresellRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "validation_error", "message": err.Error()}})
		return
	}

	in := services.UpdatePresellInput{
		Type:         req.Type,
		TemplateSlug: req.TemplateSlug,
		Config:       configFromDTO(req.Config),
	}
	if req.CallID != "" {
		cid, err := uuid.Parse(req.CallID)
		if err == nil {
			in.CallID = &cid
		}
	}

	p, err := h.svc.Update(c.Request.Context(), uid, id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": toPresellDTO(p)})
}

func (h *PresellHandler) Delete(c *gin.Context) {
	uid := mustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), uid, id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// UploadImage — POST /presell/:id/image  (multipart field "image")
func (h *PresellHandler) UploadImage(c *gin.Context) {
	uid := mustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	// Verify ownership before upload
	if _, err := h.svc.GetByID(c.Request.Context(), uid, id); err != nil {
		respondError(c, err)
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, imageMaxBytes+1024)

	file, _, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "campo 'image' obrigatório"}})
		return
	}
	defer file.Close()

	key, url, err := h.svc.UploadImage(c.Request.Context(), uid, file)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"key": key, "url": url})
}

// GetByCallID — GET /calls/:id/presells — retorna presells vinculados a uma chamada.
func (h *PresellHandler) GetByCallID(c *gin.Context) {
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "id inválido"}})
		return
	}

	pages, err := h.svc.GetByCallID(c.Request.Context(), callID)
	if err != nil {
		respondError(c, err)
		return
	}

	dtos := make([]presellDTO, len(pages))
	for i, p := range pages {
		dtos[i] = toPresellDTO(&p)
	}
	c.JSON(http.StatusOK, gin.H{"data": dtos})
}

// CTAClick — POST /public/presell/:slug/cta-click — incrementa cliques no CTA.
func (h *PresellHandler) CTAClick(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "bad_request", "message": "slug inválido"}})
		return
	}
	_ = h.svc.TrackCTAClick(c.Request.Context(), slug)
	c.Status(http.StatusNoContent)
}

// GetPublic — sem autenticação, para a página /p/:slug
func (h *PresellHandler) GetPublic(c *gin.Context) {
	p, err := h.svc.GetPublic(c.Request.Context(), c.Param("slug"))
	if err != nil {
		respondError(c, err)
		return
	}

	dto := toPresellDTO(p)
	tracking, _ := h.tracking.Get(c.Request.Context(), p.UserID)
	var trackingMap gin.H
	if tracking != nil {
		trackingMap = gin.H{
			"facebook_pixel_id":   tracking.FacebookPixelID,
			"tiktok_pixel_id":     tracking.TikTokPixelID,
			"google_analytics_id": tracking.GoogleAnalyticsID,
			"gtm_container_id":    tracking.GTMContainerID,
			"utmify_token":        tracking.UTMifyToken,
			"custom_head_script":  tracking.CustomHeadScript,
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"id":            dto.ID,
		"slug":          dto.Slug,
		"type":          dto.Type,
		"template_slug": dto.TemplateSlug,
		"config":        dto.Config,
		"tracking":      trackingMap,
		"created_at":    dto.CreatedAt,
		"updated_at":    dto.UpdatedAt,
	}})
}

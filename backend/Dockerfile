FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/worker ./cmd/worker

FROM alpine:3.20
# ffmpeg: usado para otimizar vídeos no upload (faststart / moov atom no início).
RUN apk add --no-cache ca-certificates tzdata ffmpeg
WORKDIR /app
COPY --from=builder /out/api /app/api
COPY --from=builder /out/worker /app/worker
COPY --from=builder /app/migrations /app/migrations
EXPOSE 8080
ENTRYPOINT ["/app/api"]

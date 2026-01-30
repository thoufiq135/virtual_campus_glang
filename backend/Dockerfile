FROM golang:1.25-alpine AS builder

WORKDIR /build

COPY go.mod ./
RUN go mod download

COPY . .

RUN go build -o server


FROM alpine:latest

WORKDIR /app

COPY --from=builder /build/server /app/server

EXPOSE 8080

CMD ["/app/server"]

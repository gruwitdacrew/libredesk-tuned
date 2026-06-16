# Просто захардкодьте версию
LAST_COMMIT := "manual"
VERSION := "v0.0.0"

BUILDSTR := ${VERSION} (\#${LAST_COMMIT})

# Binary names and paths
BIN := ./out/libredesk
FRONTEND_DIR := frontend
FRONTEND_DIST := ${FRONTEND_DIR}/dist
STATIC := ${FRONTEND_DIST} i18n schema.sql static
GOPATH ?= $(HOME)/go
STUFFBIN ?= $(GOPATH)/bin/stuffbin
COMPOSE := docker compose
PROXY_SERVICE := socat

# The default target to run when `make` is executed.
.DEFAULT_GOAL := build 

# Install stuffbin if it doesn't exist.
$(STUFFBIN):
	@echo "→ Installing stuffbin..."
	@go install github.com/knadh/stuffbin/...

# Install dependencies for both backend and frontend.
.PHONY: install-deps
install-deps: $(STUFFBIN)
	@echo "→ Installing frontend dependencies..."
	@cd ${FRONTEND_DIR} && pnpm install

# Build the frontend for production (both apps).
.PHONY: frontend-build
frontend-build: install-deps
	@echo "→ Building frontend for production - main app & widget..."
	@cd ${FRONTEND_DIR} && pnpm build:main
	@cd ${FRONTEND_DIR} && pnpm build:widget

# Build only the main frontend app.
.PHONY: frontend-build-main
frontend-build-main: install-deps
	@echo "→ Building main frontend app for production..."
	@cd ${FRONTEND_DIR} && pnpm build:main

# Build only the widget frontend app.
.PHONY: frontend-build-widget
frontend-build-widget: install-deps
	@echo "→ Building widget frontend app for production..."
	@cd ${FRONTEND_DIR} && pnpm build:widget

# Run the Go backend server in development mode.
.PHONY: run-backend
run-backend:
	@echo "→ Running backend..."
	go run -ldflags="-s -w -X 'main.buildString=${BUILDSTR}' -X 'main.versionString=${VERSION}' -X 'github.com/abhinavxd/libredesk/internal/version.Version=${VERSION}' -X 'main.frontendDir=frontend/dist'" ./cmd/

# Run the JS frontend server in development mode (main app only).
.PHONY: run-frontend
run-frontend:
	@echo "→ Installing frontend dependencies (if not already installed)..."
	@cd ${FRONTEND_DIR} && pnpm install
	@echo "→ Running main frontend app..."
	@cd ${FRONTEND_DIR} && pnpm dev:main

# Run the main frontend app in development mode.
.PHONY: run-frontend-main
run-frontend-main:
	@echo "→ Installing frontend dependencies (if not already installed)..."
	@cd ${FRONTEND_DIR} && pnpm install
	@echo "→ Running main frontend app..."
	@cd ${FRONTEND_DIR} && pnpm dev:main

# Run the widget frontend app in development mode.
.PHONY: run-frontend-widget
run-frontend-widget:
	@echo "→ Installing frontend dependencies (if not already installed)..."
	@cd ${FRONTEND_DIR} && pnpm install
	@echo "→ Running widget frontend app..."
	@cd ${FRONTEND_DIR} && pnpm dev:widget

# Build the backend binary.
.PHONY: build-backend
build-backend: $(STUFFBIN)
	@echo "→ Building backend..."
	@CGO_ENABLED=0 go build -a \
		-ldflags="-X 'main.buildString=${BUILDSTR}' -X 'main.versionString=${VERSION}' -X 'github.com/abhinavxd/libredesk/internal/version.Version=${VERSION}' -s -w" \
		-o ${BIN} ./cmd/...

# Main build target: builds both frontend and backend, then stuffs static assets into the binary.
.PHONY: build
build: frontend-build build-backend stuff
	@echo "→ Build successful. Current version: $(VERSION)"

# Stuff static assets into the binary using stuffbin.
.PHONY: stuff
stuff: $(STUFFBIN)
	@echo "→ Stuffing static assets into binary..."
	@$(STUFFBIN) -a stuff -in ${BIN} -out ${BIN} ${STATIC}

# Build the application in demo mode.
.PHONY: demo-build
demo-build:
	@echo "→ Building in demo mode..."
	@$(MAKE) build

# Run tests.
.PHONY: test
test:
	@echo "→ Running Go tests..."
	go test -count=1 ./...
	@echo "→ Running frontend tests..."
	cd ${FRONTEND_DIR} && npx pnpm install --frozen-lockfile && npx pnpm test:run

.PHONY: proxy-up 
proxy-up:
	$(COMPOSE) up -d $(PROXY_SERVICE)


.PHONY: proxy-down
proxy-down:
	$(COMPOSE) stop $(PROXY_SERVICE) && $(COMPOSE) rm -f $(PROXY_SERVICE)

.PHONY: proxy-restart
proxy-restart:
	$(COMPOSE) restart $(PROXY_SERVICE)

.PHONY: proxy-logs
proxy-logs:
	$(COMPOSE) logs -f $(PROXY_SERVICE)

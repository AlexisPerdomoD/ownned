################################################################################
-include .env
export
# COMMANDS
DOCKER_COMPOSE := docker compose
DOCKER := docker

# ENVS
PG_MIGRATION_DIR := ./internal/infrastructure/db/migrations/postgres
PG_DB_URL := postgresql://$(PG_USER):$(PG_PASSWORD)@$(PG_HOST):$(PG_PORT)/$(PG_DB)?sslmode=$(PG_SSL)
TEST_PG_DB_URL := postgresql://$(TEST_PG_USER):$(TEST_PG_PASSWORD)@$(TEST_PG_HOST):$(TEST_PG_PORT)/$(TEST_PG_DB)?sslmode=$(TEST_PG_SSL)
# FILES
DB_COMPOSE_FILE := db-docker-compose.yaml
TEST_DB_COMPOSE_FILE := db-docker-compose.test.yaml
# VARS 
HTTP_SERVER_BINARY=bin/server
################################################################################
# LOCAL DB COMMANDS
################################################################################
db-local-up:
	@echo "\nStarting local DB..."
	$(DOCKER_COMPOSE) -f $(DB_COMPOSE_FILE) -p local up -d --wait
	@echo "Local DB started."

db-local-down:
	@echo "\nStopping local DB..."
	$(DOCKER_COMPOSE) -f $(DB_COMPOSE_FILE) -p local down
	@echo "Local DB stopped."

db-local-reset:
	$(DOCKER_COMPOSE) -f $(DB_COMPOSE_FILE) -p local down -v
	$(MAKE) db-local-up

db-local-console:
	$(DOCKER) exec -it $$(docker ps -qf name=ownned_local_container) psql -h localhost -U postgres -d local_db

################################################################################
# TEST DB COMMANDS
################################################################################

test-local-up-db: check-migrate
	$(DOCKER_COMPOSE) -f $(TEST_DB_COMPOSE_FILE) up -d --wait
	@sleep 1
	@echo "test database ready"

test-local-down-db: check-migrate
	$(DOCKER_COMPOSE) -f $(TEST_DB_COMPOSE_FILE) down

test-migrate-up: test-local-up-db
	@migrate -path $(PG_MIGRATION_DIR) -database $(TEST_PG_DB_URL) up

test-migrate-down: test-local-up-db
	@migrate -path $(CR_MIGRATION_DIR) -database $(TEST_PG_DB_URL) down

test-local: test-migrate-up
	@clear
	@echo "running tests"
	go test ./... -v | sed '/^?/d'
	# @go test -v ./... | grep --color=always -v "^?"
	$(DOCKER_COMPOSE) -f $(TEST_DB_COMPOSE_FILE) down

################################################################################
# DOCKER COMMANDS
################################################################################

check-migrate:
	@command -v migrate >/dev/null 2>&1 || { \
		echo "❌ migrate not installed"; \
		echo "👉 install: https://github.com/golang-migrate/migrate"; \
		exit 1; \
	}


migrate-create:
	migrate create -ext sql -dir $(PG_MIGRATION_DIR) -seq change_me

migrate-up: check-migrate
	migrate -path $(PG_MIGRATION_DIR) -database "$(PG_DB_URL)" up

migrate-down: check-migrate
	migrate -path $(PG_MIGRATION_DIR) -database "$(PG_DB_URL)" down

build-web:
	@cd web/app && pnpm i && pnpm build
	@rm -rf web/dist
	@cp -r web/app/dist web/dist
	@echo "Web properly build!"

build-http:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
	go build -ldflags="-s -w" -o $(HTTP_SERVER_BINARY) ./cmd/server
	@echo "Bin properly compiled!"

build-http-lite:
	go build -o $(HTTP_SERVER_BINARY) ./cmd/server

start-http: build-http 
	@echo "Starting running HTTP Server..."
	@$(HTTP_SERVER_BINARY)

superusr: 
	GOTRACEBACK=all go run ./cmd/superusr $(ARGS)

approot:
	go run ./cmd/approot $(ARGS)

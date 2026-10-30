# Bank Microservices

A Spring Boot 4 / Java 21 microservices banking platform with an agentic AI assistant powered by a local LLM. The system covers account management, fund transfers, and a natural-language chat interface that can read and mutate live bank data through MCP tool calls.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│   bank-web-client  :4200        │  Angular 22 SPA
└────────────┬────────────────────┘
             │ /api/*
             ▼
┌─────────────────────────────────┐
│   gateway-service  :8085        │  Spring Cloud Gateway (MVC)
└──┬──────┬──────┬──────┬─────────┘
   │      │      │      │
   │      │      │      └─ /api/chat/**
   │      │      │                ▼
   │      │      │   ┌────────────────────────┐
   │      │      │   │  bank-ai-assistant :8083│
   │      │      │   │  Ollama + llama3.2      │
   │      │      │   │  MCP client             │
   │      │      │   └──────┬─────────┬────────┘
   │      │      │          │  MCP    │  MCP
   │      │      │          ▼         ▼
   │ /api/accounts/**    ┌──────────────────────────┐
   │      │              │  account-service  :8081   │
   │      │              │  REST · GraphQL · MCP     │
   │      │              │  H2 in-memory DB          │
   │      │              └──────────────┬────────────┘
   │      │                             │ Feign (debit/credit)
   │ /api/transactions/**               │
   └──────┼─────────────────────────────┘
          ▼
   ┌──────────────────────────────┐
   │  transaction-service  :8082  │
   │  REST · GraphQL · MCP        │
   │  Resilience4j Circuit Breaker│
   │  H2 in-memory DB             │
   └──────────────────────────────┘

Infrastructure
  config-service   :8888  — Spring Cloud Config (native classpath)
  discovery-service :8761  — Netflix Eureka registry
  ollama           :11434  — Local LLM inference
```

---

## Services

| Service | Port | Purpose |
|---|---|---|
| `config-service` | 8888 | Centralised configuration server |
| `discovery-service` | 8761 | Eureka service registry |
| `account-service` | 8081 | Account CRUD, balance mutations, GraphQL, MCP |
| `transaction-service` | 8082 | Fund transfers, circuit breaker, GraphQL, MCP |
| `bank-ai-assistant` | 8083 | Agentic AI chat backed by Ollama + MCP clients |
| `gateway-service` | 8085 | API gateway, routing, CORS |
| `bank-web-client` | 4200 | Angular SPA |

---

## Quick Start

### Prerequisites

- Docker Desktop (with Compose v2)
- 4 GB+ free RAM (Ollama + llama3.2 model)

### 1. Pull the LLM model

The AI assistant uses `llama3.2` by default. Pull it before starting the stack so Ollama does not time out during container startup:

```bash
docker run --rm -v ollama-data:/root/.ollama ollama/ollama pull llama3.2
```

### 2. Start the full stack

```bash
docker compose up --build
```

Services start in dependency order and wait for health checks. The full stack takes 1–2 minutes on first build.

### 3. Open the web client

```
http://localhost:4200
```

### Running services individually (local dev)

Each service can be started standalone — infrastructure dependencies (Config Server, Eureka) are disabled by default:

```bash
# From the service directory
./mvnw spring-boot:run
```

Activate infrastructure integration when needed:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=infrastructure
```

---

## Key Features

**Account management**
- Create accounts with a customer reference, currency, and optional opening balance
- Block or reactivate accounts
- Debit and credit endpoints with pessimistic locking to prevent race conditions

**Fund transfers**
- Transfers validate: different accounts, positive amount ≤ configured maximum (default 1000), matching 3-letter currency codes
- Compensation pattern: if credit to destination fails after debit from source succeeds, the source is automatically re-credited
- Resilience4j circuit breaker wraps all account-service calls from transaction-service

**AI assistant (BankAI)**
- Natural-language interface in English, French, or Arabic
- Direct access to live account and transaction data via MCP tools
- Multi-turn conversation with history
- Confirms destructive operations (transfers, account blocking) before executing

**Multiple API styles**
- REST endpoints on all business services
- GraphQL on account-service and transaction-service
- MCP (Streamable HTTP) on account-service and transaction-service for AI tool access
- Swagger UI at `/swagger-ui.html` on each business service

---

## API Reference (via Gateway)

All requests go through the gateway on port **8085**.

### Accounts

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/accounts` | Create account |
| `GET` | `/api/accounts` | List all accounts |
| `GET` | `/api/accounts/{id}` | Get account by UUID |
| `PATCH` | `/api/accounts/{id}/status` | Update status (ACTIVE / BLOCKED) |
| `POST` | `/api/accounts/{id}/debit` | Debit balance |
| `POST` | `/api/accounts/{id}/credit` | Credit balance |

### Transactions

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/transactions` | Transfer between accounts |
| `GET` | `/api/transactions` | List all (optional `?accountId=` filter) |
| `GET` | `/api/transactions/{id}` | Get transaction by UUID |

### Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/message` | Send a message (supports history) |
| `GET` | `/api/chat/info` | Assistant status |

### GraphQL

| Path | Service |
|---|---|
| `/account/graphql` | account-service |
| `/transaction/graphql` | transaction-service |

---

## Configuration

The config-service distributes shared configuration from `config-service/src/main/resources/config/application.properties`.

Key overridable settings:

| Property | Default | Description |
|---|---|---|
| `bank.transaction.max-amount` | `1000` | Maximum single transfer amount |
| `OLLAMA_MODEL` | `llama3.2` | LLM model name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `ACCOUNT_MCP_URL` | `http://localhost:8081` | Account service MCP endpoint |
| `TRANSACTION_MCP_URL` | `http://localhost:8082` | Transaction service MCP endpoint |

---

## Tech Stack

- **Java 21**, **Spring Boot 4.0.9**, **Spring Cloud 2025.1.4**
- **Spring AI 2.0.1** — Ollama integration, MCP server/client
- **Spring Cloud Gateway** (MVC), **Eureka**, **OpenFeign**, **Config Server**
- **Resilience4j** — circuit breaker
- **Spring Data JPA** + **H2** — in-memory persistence
- **Spring for GraphQL**
- **Angular 22** — web client
- **Ollama** + **llama3.2** — local LLM
- **Docker Compose** — container orchestration

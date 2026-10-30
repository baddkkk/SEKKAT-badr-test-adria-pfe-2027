# Developer Documentation

Technical reference for contributors and developers working on the bank-microservices project.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Local Development Setup](#local-development-setup)
3. [Service Details](#service-details)
   - [config-service](#config-service)
   - [discovery-service](#discovery-service)
   - [account-service](#account-service)
   - [transaction-service](#transaction-service)
   - [bank-ai-assistant](#bank-ai-assistant)
   - [gateway-service](#gateway-service)
   - [bank-web-client](#bank-web-client)
4. [Cross-Service Communication](#cross-service-communication)
5. [MCP Tool Integration](#mcp-tool-integration)
6. [Data Model](#data-model)
7. [Resilience Patterns](#resilience-patterns)
8. [Configuration Profiles](#configuration-profiles)
9. [Docker Compose](#docker-compose)
10. [Adding a New Service](#adding-a-new-service)

---

## Project Structure

```
bank-microservices/
├── config-service/          # Spring Cloud Config Server
├── discovery-service/       # Netflix Eureka Server
├── account-service/         # Account domain microservice
├── transaction-service/     # Transaction domain microservice
├── bank-ai-assistant/       # Agentic AI chat service
├── gateway-service/         # API gateway (Spring Cloud Gateway MVC)
├── bank-web-client/         # Angular 22 SPA
├── docker-compose.yml       # Full-stack container orchestration
└── pom.xml                  # Root/parent POM (if present)
```

Each service is a self-contained Maven project with its own `pom.xml`, `Dockerfile`, and Spring Boot main class.

---

## Local Development Setup

### Requirements

- JDK 21 (`java -version` should show 21)
- Maven 3.9+ or use the `./mvnw` wrapper bundled in each service
- Docker Desktop (for running with Compose or for infrastructure dependencies)
- Node.js 22+ and npm (for bank-web-client)
- Ollama installed locally (for bank-ai-assistant)

### Running without Docker

Start services in this order, each from its own directory:

```powershell
# 1. Config server (optional for local dev — disabled by default in other services)
cd config-service; ./mvnw spring-boot:run

# 2. Discovery service (optional for local dev)
cd discovery-service; ./mvnw spring-boot:run

# 3. Account service
cd account-service; ./mvnw spring-boot:run

# 4. Transaction service
cd transaction-service; ./mvnw spring-boot:run

# 5. Ollama (must be running for AI assistant)
ollama serve
ollama pull llama3.2

# 6. AI assistant
cd bank-ai-assistant; ./mvnw spring-boot:run

# 7. Gateway
cd gateway-service; ./mvnw spring-boot:run

# 8. Web client
cd bank-web-client; npm install; npm start
```

By default, services 3–7 have `eureka.client.enabled=false` and `spring.cloud.config.enabled=false`, so they boot independently without 1 and 2.

### Running with infrastructure (Eureka + Config Server)

```powershell
./mvnw spring-boot:run -Dspring-boot.run.profiles=infrastructure
```

The `infrastructure` profile sets:
- `spring.cloud.config.enabled=true` → connects to `localhost:8888`
- `eureka.client.enabled=true` → registers with `localhost:8761`

---

## Service Details

### config-service

**Port:** 8888  
**Main class:** `ConfigServiceApplication` (`@EnableConfigServer`)  
**Config backend:** Native (classpath), no Git required.

Shared properties distributed to all clients live at:
```
config-service/src/main/resources/config/application.properties
```

To add per-service overrides, create:
```
config-service/src/main/resources/config/<spring.application.name>.properties
```

Spring Cloud Config resolves in order: `application.properties` → `<service-name>.properties` → `<service-name>-<profile>.properties`.

---

### discovery-service

**Port:** 8761  
**Main class:** `DiscoveryServiceApplication` (`@EnableEurekaServer`)

The Eureka dashboard is available at `http://localhost:8761`. The server does not register itself (`eureka.client.register-with-eureka=false`).

Business services use the `infrastructure`/`docker` profile to enable Eureka registration. The gateway routes are explicit URLs rather than `lb://` URIs, so service discovery is used for registration visibility but not for load-balancing in this project.

---

### account-service

**Port:** 8081  
**Package:** `net.badr.accountservice`  
**DB:** H2 in-memory (`jdbc:h2:mem:accountdb`)

#### Package layout

```
accountservice/
├── AccountServiceApplication.java
├── domain/
│   ├── Account.java          # JPA entity
│   └── AccountStatus.java    # Enum: ACTIVE, BLOCKED
├── repository/
│   └── AccountRepository.java
├── service/
│   └── AccountService.java
├── web/
│   ├── rest/
│   │   ├── AccountController.java
│   │   └── HomeController.java   # Redirects / → /swagger-ui.html
│   └── graphql/
│       └── AccountGraphqlController.java
└── mcp/
    └── AccountMcpTools.java
```

#### REST endpoints

| Method | Path | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/accounts` | `{customerReference, currency, initialBalance?}` | Create |
| `GET` | `/api/accounts` | — | List all |
| `GET` | `/api/accounts/{id}` | — | Find by UUID |
| `PATCH` | `/api/accounts/{id}/status` | `{status: ACTIVE|BLOCKED}` | Update status |
| `POST` | `/api/accounts/{id}/debit` | `{amount, currency}` | Debit balance |
| `POST` | `/api/accounts/{id}/credit` | `{amount, currency}` | Credit balance |

#### GraphQL schema

```graphql
type Query {
  accounts: [Account!]!
  account(id: ID!): Account!
}
type Mutation {
  createAccount(customerReference: String!, currency: String!, initialBalance: Float): Account!
  updateAccountStatus(id: ID!, status: AccountStatus!): Account!
}
enum AccountStatus { ACTIVE BLOCKED }
type Account {
  id: ID!
  customerReference: String!
  currency: String!
  balance: Float!
  status: AccountStatus!
}
```

#### Business rules

- Opening balance defaults to 0 if not provided; cannot be negative.
- Debit validates: account ACTIVE, matching currency, sufficient balance.
- Credit validates: account ACTIVE, matching currency.
- Debit and credit use `PESSIMISTIC_WRITE` lock (`findByIdForUpdate`) to prevent concurrent balance races.

#### MCP tools exposed

| Tool | Signature | Description |
|---|---|---|
| `listAccounts` | `() → List<Account>` | All accounts |
| `getAccount` | `(UUID id) → Account` | One account |
| `createAccount` | `(String customerRef, String currency, BigDecimal initialBalance?) → Account` | Create |
| `updateAccountStatus` | `(UUID id, AccountStatus status) → Account` | Block / activate |

MCP server type: `STREAMABLE` HTTP. The MCP endpoint is served from the same port as REST (8081).

---

### transaction-service

**Port:** 8082  
**Package:** `net.badr.transactionservice`  
**DB:** H2 in-memory (`jdbc:h2:mem:transactiondb`)

#### Package layout

```
transactionservice/
├── TransactionServiceApplication.java
├── domain/
│   ├── Transaction.java
│   └── TransactionStatus.java    # Enum: COMPLETED, FAILED
├── repository/
│   └── TransactionRepository.java
├── service/
│   └── TransactionService.java
├── client/
│   └── AccountClient.java        # OpenFeign client for account-service
├── web/
│   ├── rest/
│   │   └── TransactionController.java
│   └── graphql/
│       └── TransactionGraphqlController.java
└── mcp/
    └── TransactionMcpTools.java
```

#### REST endpoints

| Method | Path | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/transactions` | `{sourceAccountId, destinationAccountId, amount, currency}` | Transfer |
| `GET` | `/api/transactions` | `?accountId=UUID` (optional) | List all / by account |
| `GET` | `/api/transactions/{id}` | — | Find by UUID |

#### Transfer flow

```
TransactionService.transfer()
  1. validateTransfer() — checks IDs, amount > 0, amount ≤ max, 3-letter currency
  2. accountClient.debit(sourceId, {amount, currency})   ← HTTP POST to account-service
  3. accountClient.credit(destinationId, {amount, currency})  ← HTTP POST to account-service
     └── if credit fails:
           accountClient.credit(sourceId, ...)           ← compensation (rollback debit)
           save Transaction{status=FAILED}
           rethrow
  4. save Transaction{status=COMPLETED}

Wrapped by @CircuitBreaker(name="accountService", fallbackMethod="transferUnavailable")
  └── fallback throws 503 SERVICE_UNAVAILABLE immediately if circuit is open
```

#### Circuit breaker config

Configured in `application.properties`:
- Sliding window: 10 calls, min 5
- Failure rate threshold: 50%
- Wait in OPEN state: 10 seconds

#### Maximum transfer amount

Defaults to `1000`, sourced from the config server property `bank.transaction.max-amount`. Change it in:
```
config-service/src/main/resources/config/application.properties
```

#### GraphQL schema

```graphql
type Query {
  transactions(accountId: ID): [Transaction!]!
  transaction(id: ID!): Transaction!
}
type Mutation {
  createTransaction(
    sourceAccountId: ID!
    destinationAccountId: ID!
    amount: Float!
    currency: String!
  ): Transaction!
}
enum TransactionStatus { COMPLETED FAILED }
type Transaction {
  id: ID!
  sourceAccountId: ID!
  destinationAccountId: ID!
  amount: Float!
  currency: String!
  status: TransactionStatus!
  createdAt: String!
}
```

#### MCP tools exposed

| Tool | Signature | Description |
|---|---|---|
| `listTransactions` | `() → List<Transaction>` | All transactions |
| `listTransactionsForAccount` | `(UUID accountId) → List<Transaction>` | By account (sorted desc) |
| `transfer` | `(UUID src, UUID dst, BigDecimal amount, String currency) → Transaction` | Execute transfer |

---

### bank-ai-assistant

**Port:** 8083  
**Package:** `net.badr.bankaiassistant`  
**LLM:** Ollama (`llama3.2` by default)

#### How the AI tools are wired

At startup, `spring-ai-starter-mcp-client` creates two MCP connections (configured in `application.properties`):
- `accounts` → `http://localhost:8081` (account-service)
- `transactions` → `http://localhost:8082` (transaction-service)

Both services expose their MCP tools over Streamable HTTP. Spring AI auto-discovers all tools from both connections and injects them as a `ToolCallbackProvider` bean. The `ChatController` registers this provider as default tools on the `ChatClient`:

```java
this.chatClient = builder
    .defaultSystem(SYSTEM_PROMPT)
    .defaultTools(toolCallbackProvider)  // all 7 MCP tools auto-registered
    .build();
```

When the LLM decides a tool call is needed, Spring AI intercepts the response, executes the tool, and feeds the result back to the LLM automatically.

#### Available tools (from both MCP servers)

| Tool | Source service |
|---|---|
| `listAccounts` | account-service |
| `getAccount` | account-service |
| `createAccount` | account-service |
| `updateAccountStatus` | account-service |
| `listTransactions` | transaction-service |
| `listTransactionsForAccount` | transaction-service |
| `transfer` | transaction-service |

#### Chat API

```
POST /api/chat/message
Content-Type: application/json

{
  "message": "Show me all accounts",
  "chatId": "optional-session-id",
  "history": [
    { "role": "USER",      "content": "previous user message" },
    { "role": "ASSISTANT", "content": "previous assistant response" }
  ]
}

Response:
{
  "chatId": "uuid",
  "response": "Here are all accounts: ..."
}
```

`history` is optional. Pass the prior turns to enable multi-turn conversations. The frontend is responsible for accumulating history.

```
GET /api/chat/info
→ { "name": "BankAI", "model": "llama3.2", "status": "online", "timestamp": "..." }
```

#### Ollama model configuration

```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=llama3.2
spring.ai.ollama.chat.options.temperature=0.3
spring.ai.ollama.chat.options.num-ctx=8192
```

To use a different model: set `OLLAMA_MODEL` environment variable (or `spring.ai.ollama.chat.options.model`). Make sure the model is pulled first: `ollama pull <model-name>`.

---

### gateway-service

**Port:** 8085  
**Type:** Spring Cloud Gateway MVC (servlet-based, not reactive WebFlux)

#### Route table

| Route ID | Predicate | Target | Notes |
|---|---|---|---|
| `account-service` | `Path=/api/accounts/**` | `http://account-service:8081` | Pass-through |
| `transaction-service` | `Path=/api/transactions/**` | `http://transaction-service:8082` | Pass-through |
| `account-graphql` | `Path=/account/graphql` | `http://account-service:8081` | `StripPrefix=1` → `/graphql` |
| `transaction-graphql` | `Path=/transaction/graphql` | `http://transaction-service:8082` | `StripPrefix=1` → `/graphql` |
| `bank-ai-assistant` | `Path=/api/chat/**` | `http://bank-ai-assistant:8083` | Pass-through |

Local dev uses `localhost` hostnames; Docker uses Compose service names.

#### CORS

Global CORS allows `*` origins, `GET/POST/PUT/PATCH/DELETE/OPTIONS`, and `*` headers. This is intentionally permissive for local development. Tighten `allowed-origins` for production.

---

### bank-web-client

**Port:** 4200 (dev), 80 (Nginx in Docker)  
**Stack:** Angular 22, TypeScript 6, standalone components

#### Routes

| Path | Component |
|---|---|
| `/dashboard` | `DashboardComponent` |
| `/accounts` | `AccountsComponent` |
| `/transactions` | `TransactionsComponent` |
| `/assistant` | `AssistantComponent` |

#### Services

| Service | Calls |
|---|---|
| `AccountService` | `/api/accounts/**` |
| `TransactionService` | `/api/transactions/**` |
| `ChatService` | `/api/chat/**` |
| `ToastService` | Notification helper (no HTTP) |

#### Dev proxy

`proxy.conf.json` proxies `/api` → `http://localhost:8085` so the Angular dev server avoids CORS issues locally.

#### Nginx (Docker)

`nginx.conf` in the Docker image:
- Proxies `/api/` → `http://gateway-service:8085`
- Serves `index.html` for all other routes (SPA fallback with `try_files`)
- Caches static assets for 1 year

---

## Cross-Service Communication

### REST (synchronous)

`transaction-service` → `account-service` via OpenFeign:

```java
@FeignClient(name = "account-service", url = "${account-service.url}")
public interface AccountClient {
    @PostMapping("/api/accounts/{id}/debit")
    Account debit(@PathVariable UUID id, @RequestBody BalanceAdjustmentRequest req);

    @PostMapping("/api/accounts/{id}/credit")
    Account credit(@PathVariable UUID id, @RequestBody BalanceAdjustmentRequest req);
}
```

URL is configured per profile:
- Local: `account-service.url=http://localhost:8081`
- Docker: `account-service.url=http://account-service:8081`

### MCP (AI tooling)

`bank-ai-assistant` connects to `account-service` and `transaction-service` as MCP clients. Both services run embedded MCP servers using `spring-ai-starter-mcp-server-webmvc`.

```
bank-ai-assistant
  └─ MCP client → http://account-service:8081    (STREAMABLE HTTP)
  └─ MCP client → http://transaction-service:8082 (STREAMABLE HTTP)
```

The MCP endpoint is hosted on the same port as the REST API.

---

## MCP Tool Integration

### Adding a new MCP tool

1. Create a `@Component` class in the `mcp` package of the service.
2. Annotate methods with `@McpTool(description = "...")`.
3. Annotate parameters with `@McpToolParam(description = "...", required = false)`.
4. The tool is auto-discovered and registered on startup.

Example:

```java
@Component
public class MyMcpTools {
    @McpTool(description = "Get account balance summary")
    public BigDecimal getTotalBalance() {
        // ...
    }
}
```

The AI assistant automatically sees the new tool at next startup (no changes needed in `bank-ai-assistant`).

### Tool naming

Spring AI derives the tool name from the method name. Keep method names short and descriptive — the LLM uses them to decide which tool to call.

---

## Data Model

### Account

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `customerReference` | `String` | Required, identifies the customer |
| `currency` | `String` | 3-letter ISO code, e.g. `MAD`, `EUR` |
| `balance` | `double` | Defaults to 0.0 |
| `status` | `AccountStatus` | `ACTIVE` or `BLOCKED`, defaults to `ACTIVE` |

### Transaction

| Field | Type | Notes |
|---|---|---|
| `id` | `UUID` | Auto-generated |
| `sourceAccountId` | `UUID` | Sender |
| `destinationAccountId` | `UUID` | Recipient |
| `amount` | `BigDecimal` | Scale 2, precision 19 |
| `currency` | `String` | 3-letter code |
| `status` | `TransactionStatus` | `COMPLETED` or `FAILED` |
| `createdAt` | `Instant` | Set on creation |

Both services use H2 in-memory databases. **Data does not persist across restarts.** To switch to a persistent database, replace the H2 dependency with the target DB driver and update the datasource properties.

---

## Resilience Patterns

### Pessimistic locking (account-service)

`AccountRepository` provides a `findByIdForUpdate(UUID id)` method with `@Lock(LockModeType.PESSIMISTIC_WRITE)`. This prevents lost updates when concurrent requests debit or credit the same account.

### Compensation (transaction-service)

The transfer operation follows a try-compensate pattern:
1. Debit source.
2. Credit destination.
3. If step 2 fails → credit source back (compensate).
4. Save `FAILED` transaction and rethrow.

If compensation itself fails, the exception is added as a suppressed throwable on the original exception.

### Circuit breaker (transaction-service)

`@CircuitBreaker(name = "accountService")` wraps the entire `transfer` method. When the circuit is OPEN (account-service is down or failing), the fallback immediately returns `503 SERVICE_UNAVAILABLE` without attempting any account mutations.

---

## Configuration Profiles

| Profile | Purpose | Key differences |
|---|---|---|
| _(default)_ | Local development | Eureka disabled, Config Server disabled, direct localhost URLs |
| `infrastructure` | Local dev with infra | Eureka and Config Server enabled, localhost hostnames |
| `docker` | Docker Compose | Eureka and Config Server enabled, Docker Compose service hostnames |

Profile files follow the pattern:
```
src/main/resources/application.properties          ← base (default profile)
src/main/resources/application-infrastructure.properties
src/main/resources/application-docker.properties
```

---

## Docker Compose

### Startup order

Docker Compose health checks enforce this startup sequence:

```
config-service
  └─► discovery-service
        └─► account-service
              └─► transaction-service
                    └─► bank-ai-assistant (also waits for ollama)
                    └─► gateway-service
                          └─► bank-web-client (also waits for bank-ai-assistant)
ollama (independent)
```

### Volumes

`ollama-data` is a named volume that persists Ollama model files across `docker compose down` / `up` cycles. Destroy it with `docker volume rm bank-microservices_ollama-data` if you need a clean state.

### Rebuilding a single service

```bash
docker compose up --build account-service
```

### Viewing logs

```bash
docker compose logs -f account-service transaction-service
```

---

## Adding a New Service

1. Generate a new Spring Boot project (`./mvnw` wrapper, same Java 21 + Spring Boot 4 parent).
2. Place it in the workspace root as a sibling directory.
3. Add a `Dockerfile` following the existing multi-stage pattern (`eclipse-temurin:21-jdk` → `eclipse-temurin:21-jre`).
4. Add the service to `docker-compose.yml` with a health check and appropriate `depends_on`.
5. Add a gateway route in `gateway-service/src/main/resources/application.properties` (and the docker profile equivalent).
6. If the service needs the max-amount or other shared config, declare it in `config-service/src/main/resources/config/application.properties`.
7. If the AI assistant should call the new service, add `@McpTool` methods and register a new MCP client connection in `bank-ai-assistant/src/main/resources/application.properties`.

package net.badr.bankaiassistant.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    /**
     * System prompt that instructs the LLM to act as an agentic banking assistant.
     * It has direct access to the MCP tools exposed by account-service and
     * transaction-service:
     *
     * ACCOUNT TOOLS:
     *  - listAccounts()                         → all accounts
     *  - getAccount(UUID id)                    → one account by UUID
     *  - createAccount(customerRef, currency, initialBalance)
     *  - updateAccountStatus(UUID id, status)   → ACTIVE | BLOCKED
     *
     * TRANSACTION TOOLS:
     *  - listTransactions()                     → all transactions
     *  - listTransactionsForAccount(UUID id)    → transactions for one account
     *  - transfer(srcId, dstId, amount, currency) → move money between accounts
     */
    private static final String SYSTEM_PROMPT = """
            You are BankAI, an intelligent and agentic banking assistant for a Moroccan digital bank.
            You have real-time access to the bank's data through MCP tools connected to live microservices.

            ## Your capabilities via MCP tools:
            **Accounts:**
            - List all bank accounts (listAccounts)
            - Look up a specific account by its UUID (getAccount)
            - Create a new bank account for a customer (createAccount)
            - Block or reactivate an account (updateAccountStatus) — status is ACTIVE or BLOCKED

            **Transactions:**
            - List all transactions (listTransactions)
            - List all transactions for a specific account (listTransactionsForAccount)
            - Transfer money between two active accounts (transfer)

            ## Behaviour rules:
            1. ALWAYS use tool results for account balances, IDs, and transaction data — never invent numbers.
            2. Before executing a write operation (create account, transfer money, block account), confirm the exact
               details with the user and wait for explicit confirmation.
            3. Never ask for passwords, PINs, one-time codes, or full card numbers.
            4. If an operation fails, explain the failure plainly. Do not claim success when a tool returns an error.
            5. Keep replies concise and structured. Use bullet points or tables when listing multiple items.
            6. When a user asks about "all accounts" or "total balance", call listAccounts() and compute the summary.
            7. If the user provides a customer name instead of a UUID, call listAccounts() first to find the UUID.
            8. Respond in the same language the user writes in (French, Arabic, or English).
            """;

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder builder, ToolCallbackProvider toolCallbackProvider) {
        this.chatClient = builder
                .defaultSystem(SYSTEM_PROMPT)
                .defaultTools(toolCallbackProvider)
                .build();
    }

    /**
     * Main chat endpoint — supports multi-turn conversations via the history field.
     * POST /api/chat/message
     */
    @PostMapping("/message")
    public ChatResponse chat(@Valid @RequestBody ChatRequest request) {
        // Rebuild the conversation history as Spring AI messages
        List<Message> messages = new ArrayList<>();
        if (request.history() != null) {
            for (ChatTurn turn : request.history()) {
                messages.add(switch (turn.role()) {
                    case USER      -> new UserMessage(turn.content());
                    case ASSISTANT -> new AssistantMessage(turn.content());
                });
            }
        }

        String answer = chatClient.prompt()
                .messages(messages)
                .user(request.message())
                .call()
                .content();

        if (answer == null || answer.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "The AI model returned an empty response. Make sure Ollama is running and the model is pulled.");
        }

        String chatId = (request.chatId() == null || request.chatId().isBlank())
                ? UUID.randomUUID().toString()
                : request.chatId();

        return new ChatResponse(chatId, answer);
    }

    /**
     * Health / info endpoint for frontend status indicator.
     * GET /api/chat/info
     */
    @GetMapping("/info")
    public AssistantInfo info() {
        return new AssistantInfo("BankAI", "llama3.2", "online", Instant.now().toString());
    }

    // ──── Request / Response records ────────────────────────────────────────────

    public record ChatRequest(
            @NotBlank @Size(max = 4000) String message,
            @Size(max = 80)             String chatId,
            @Size(max = 40) List<@Valid ChatTurn> history
    ) {
        public ChatRequest {
            history = history == null ? List.of() : List.copyOf(history);
        }
    }

    public record ChatTurn(
            @NotNull ChatRole role,
            @NotBlank @Size(max = 4000) String content
    ) {}

    public enum ChatRole {
        USER,
        ASSISTANT
    }

    public record ChatResponse(String chatId, String response) {}

    public record AssistantInfo(String name, String model, String status, String timestamp) {}
}

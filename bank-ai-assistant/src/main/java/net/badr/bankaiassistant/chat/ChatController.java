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

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder builder, ToolCallbackProvider toolCallbackProvider) {
        this.chatClient = builder
                .defaultSystem(SYSTEM_PROMPT)
                .defaultTools(toolCallbackProvider)
                .build();
    }


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

    @GetMapping("/info")
    public AssistantInfo info() {
        return new AssistantInfo("BankAI", "llama3.2", "online", Instant.now().toString());
    }


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

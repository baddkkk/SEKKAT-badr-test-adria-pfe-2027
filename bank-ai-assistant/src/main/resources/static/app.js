const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const conversation = document.querySelector("#conversation");
const suggestions = document.querySelector("#suggestions");
const history = [];
let chatId = null;

function addMessage(role, text, typing = false) {
    const row = document.createElement("div");
    row.className = `message ${role === "USER" ? "user-message" : "assistant-message"}${typing ? " typing" : ""}`;
    if (role !== "USER") {
        const icon = document.createElement("span");
        icon.className = "message-icon";
        icon.textContent = "✦";
        row.append(icon);
    }
    const content = document.createElement("div");
    content.className = "message-content";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = role === "USER" ? "YOU" : "BANKWISE AI";
    const time = document.createElement("span");
    time.textContent = "JUST NOW";
    meta.append(time);
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    content.append(meta, paragraph);
    row.append(content);
    conversation.append(row);
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return row;
}

async function sendMessage(text) {
    const message = text.trim();
    if (!message || sendButton.disabled) return;

    suggestions.hidden = true;
    addMessage("USER", message);
    const previousTurns = history.slice(-20);
    history.push({ role: "USER", content: message });
    input.value = "";
    input.style.height = "auto";
    sendButton.disabled = true;
    const pending = addMessage("ASSISTANT", "Thinking...", true);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, chatId, history: previousTurns })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || data.message || "The assistant could not respond. Please try again.");
        chatId = data.chatId;
        pending.remove();
        addMessage("ASSISTANT", data.response);
        history.push({ role: "ASSISTANT", content: data.response });
    } catch (error) {
        pending.remove();
        addMessage("ASSISTANT", `I couldn't complete that request: ${error.message}`);
    } finally {
        sendButton.disabled = false;
        input.focus();
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(input.value);
});

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

suggestions.addEventListener("click", event => {
    const button = event.target.closest("[data-message]");
    if (button) sendMessage(button.dataset.message);
});

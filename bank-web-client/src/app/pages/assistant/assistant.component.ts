import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatTurn } from '../../services/chat.service';
import { ChatMessage } from '../../models/models';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="assistant-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="ai-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="4"/><path d="M12 12v2"/><circle cx="12" cy="17" r="2"/>
            </svg>
          </div>
          <div>
            <h3 style="font-size:0.95rem;margin:0;">BankAI Agent</h3>
            <span class="status-line" [class.online]="isOnline()" [class.offline]="!isOnline()">
              <span class="status-dot"></span>
              {{ isOnline() ? 'Online — llama3.2' : 'Connecting…' }}
            </span>
          </div>
        </div>
        <hr class="divider" />

        <!-- Capabilities -->
        <div class="sidebar-section">
          <p class="sidebar-label">MCP Tools Connected</p>
          @for (cap of capabilities; track cap.title) {
            <div class="capability-item">
              <span class="cap-icon">{{ cap.icon }}</span>
              <div>
                <p class="cap-title">{{ cap.title }}</p>
                <p class="cap-desc">{{ cap.desc }}</p>
              </div>
            </div>
          }
        </div>
        <hr class="divider" />

        <!-- Quick Prompts -->
        <div class="sidebar-section">
          <p class="sidebar-label">Quick Prompts</p>
          @for (prompt of quickPrompts; track prompt) {
            <button class="quick-prompt-btn" (click)="usePrompt(prompt)">{{ prompt }}</button>
          }
        </div>

        <div class="sidebar-footer">
          <div class="session-info">
            <span class="text-muted" style="font-size:0.72rem;">Session</span>
            <span class="font-mono" style="font-size:0.7rem;color:var(--text-muted);">{{ chatId().slice(0,8) }}…</span>
          </div>
          <button class="btn btn-ghost w-full" style="justify-content:center;margin-top:10px;" (click)="clearChat()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            New Conversation
          </button>
        </div>
      </aside>

      <!-- Main chat area -->
      <main class="chat-main">
        <!-- Header -->
        <div class="chat-header">
          <div>
            <h2 style="font-size:1.15rem;margin:0;">AI Banking Assistant</h2>
            <p style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 0;">
              Powered by Ollama · llama3.2 · {{ messages().length }} messages
            </p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div class="model-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              llama3.2 via Ollama
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="messages-container" #messagesContainer>
          @if (messages().length === 0) {
            <div class="welcome-screen">
              <div class="welcome-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <h3>How can I help you today?</h3>
              <p class="text-secondary" style="max-width:420px;text-align:center;margin-top:8px;font-size:0.9rem;">
                I'm BankAI — your agentic banking assistant. I have real-time access to accounts and transactions through MCP tools. Ask me anything.
              </p>
              <div class="welcome-chips">
                @for (prompt of quickPrompts.slice(0, 4); track prompt) {
                  <button class="chip" (click)="usePrompt(prompt)">{{ prompt }}</button>
                }
              </div>
            </div>
          } @else {
            <div class="messages-list">
              @for (msg of messages(); track msg.id) {
                <div class="message" [class]="'message-' + msg.role">
                  @if (msg.role === 'assistant') {
                    <div class="msg-avatar assistant-avatar">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M12 12v2"/><circle cx="12" cy="17" r="2"/></svg>
                    </div>
                  }
                  <div class="msg-body">
                    <div class="msg-bubble" [class]="'bubble-' + msg.role">
                      @if (msg.isStreaming) {
                        <span class="typing-dots"><span></span><span></span><span></span></span>
                      } @else {
                        <div [innerHTML]="formatMessage(msg.content)"></div>
                      }
                    </div>
                    <span class="msg-time">{{ msg.timestamp | date:'HH:mm:ss' }}</span>
                  </div>
                  @if (msg.role === 'user') {
                    <div class="msg-avatar user-avatar">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Input area -->
        <div class="input-area">
          <div class="input-container" [class.focused]="inputFocused">
            <textarea
              #inputEl
              [(ngModel)]="inputText"
              (keydown.enter)="onEnter($any($event))"
              (focus)="inputFocused = true"
              (blur)="inputFocused = false"
              placeholder="Ask about accounts, transfers, balances, or any banking operation…"
              rows="1"
              class="chat-input"
            ></textarea>
            <button
              class="send-btn"
              (click)="sendMessage()"
              [disabled]="!inputText.trim() || isLoading()"
            >
              @if (isLoading()) {
                <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-opacity="0.25"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              }
            </button>
          </div>
          <p class="input-hint">
            <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> new line &nbsp;·&nbsp;
            {{ historySize() }} turn{{ historySize() === 1 ? '' : 's' }} in context
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .assistant-layout {
      display: flex; height: calc(100vh - 64px); overflow: hidden;
    }

    /* ── Sidebar ─────────────────────────────────────────── */
    .sidebar {
      width: 280px; flex-shrink: 0;
      background: var(--bg-secondary); border-right: 1px solid var(--border-subtle);
      display: flex; flex-direction: column; overflow-y: auto; padding: 20px 16px;
    }
    .sidebar-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .ai-avatar {
      width: 44px; height: 44px; border-radius: 14px;
      background: var(--accent-gradient); display: flex; align-items: center;
      justify-content: center; color: #fff; flex-shrink: 0;
      box-shadow: var(--shadow-button); animation: float 4s ease-in-out infinite;
    }
    .status-line {
      font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .status-line.online  { color: var(--accent-success); }
    .status-line.offline { color: var(--text-muted); }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }
    .status-line.online .status-dot { animation: pulse-glow 2s infinite; }

    .sidebar-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 10px; }
    .sidebar-section { margin-bottom: 16px; }

    .capability-item { display: flex; align-items: flex-start; gap: 10px; padding: 9px 10px; border-radius: var(--radius-sm); margin-bottom: 2px; transition: var(--transition); }
    .capability-item:hover { background: var(--bg-card); }
    .cap-icon { font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
    .cap-title { font-size: 0.83rem; font-weight: 600; color: var(--text-primary); margin: 0 0 1px; }
    .cap-desc  { font-size: 0.73rem; color: var(--text-muted); margin: 0; }

    .quick-prompt-btn {
      display: block; width: 100%; text-align: left;
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm); color: var(--text-secondary);
      font-family: 'Inter', sans-serif; font-size: 0.8rem; padding: 8px 12px;
      cursor: pointer; transition: var(--transition); margin-bottom: 5px;
    }
    .quick-prompt-btn:hover { background: rgba(79,142,247,0.08); color: var(--accent-primary); border-color: var(--border-accent); }

    .sidebar-footer { margin-top: auto; padding-top: 16px; }
    .session-info { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }

    /* ── Main chat ───────────────────────────────────────── */
    .chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .chat-header {
      padding: 16px 28px; border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg-glass); backdrop-filter: blur(10px); flex-shrink: 0;
    }
    .model-badge {
      display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      border-radius: 100px; background: rgba(79,142,247,0.08);
      border: 1px solid rgba(79,142,247,0.2);
      font-size: 0.72rem; font-weight: 600; color: var(--accent-primary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* ── Messages ────────────────────────────────────────── */
    .messages-container { flex: 1; overflow-y: auto; padding: 28px; }
    .messages-list { display: flex; flex-direction: column; gap: 22px; }

    .welcome-screen {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; padding: 40px; text-align: center;
    }
    .welcome-icon {
      width: 72px; height: 72px; border-radius: 22px;
      background: var(--accent-gradient); display: flex; align-items: center;
      justify-content: center; color: #fff;
      box-shadow: 0 8px 32px rgba(79,142,247,0.4); margin-bottom: 20px;
      animation: float 3s ease-in-out infinite;
    }
    .welcome-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 24px; max-width: 560px; }
    .chip {
      padding: 8px 16px; border-radius: 100px; border: 1px solid var(--border-subtle);
      background: var(--bg-card); color: var(--text-secondary); font-size: 0.82rem;
      cursor: pointer; transition: var(--transition); font-family: 'Inter', sans-serif;
    }
    .chip:hover { background: rgba(79,142,247,0.1); border-color: var(--border-accent); color: var(--accent-primary); }

    .message { display: flex; align-items: flex-end; gap: 10px; }
    .message-user { flex-direction: row-reverse; }
    .msg-body { display: flex; flex-direction: column; max-width: 78%; }
    .message-user .msg-body { align-items: flex-end; }

    .msg-avatar {
      width: 32px; height: 32px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0; margin-bottom: 20px;
    }
    .assistant-avatar { background: var(--accent-gradient); color: #fff; }
    .user-avatar {
      background: rgba(124,92,252,0.15); color: var(--accent-secondary);
      border: 1px solid rgba(124,92,252,0.25);
    }

    .msg-bubble {
      padding: 13px 17px; border-radius: 16px; font-size: 0.875rem;
      line-height: 1.65; word-break: break-word;
    }
    .bubble-assistant {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-bottom-left-radius: 4px; color: var(--text-primary);
    }
    .bubble-user {
      background: var(--accent-gradient); color: #fff;
      border-bottom-right-radius: 4px; box-shadow: var(--shadow-button);
    }
    .msg-time { font-size: 0.68rem; color: var(--text-muted); margin-top: 5px; }

    /* Typing animation */
    .typing-dots { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
    .typing-dots span {
      width: 7px; height: 7px; border-radius: 50%; background: var(--text-secondary);
      animation: typing 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30%            { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Input area ──────────────────────────────────────── */
    .input-area {
      padding: 18px 28px; border-top: 1px solid var(--border-subtle);
      background: var(--bg-glass); backdrop-filter: blur(10px); flex-shrink: 0;
    }
    .input-container {
      display: flex; align-items: flex-end; gap: 12px;
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg); padding: 12px 12px 12px 18px;
      transition: var(--transition);
    }
    .input-container.focused { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(79,142,247,0.12); }
    .chat-input {
      flex: 1; background: transparent; border: none; outline: none; resize: none;
      color: var(--text-primary); font-family: 'Inter', sans-serif;
      font-size: 0.9rem; line-height: 1.55; max-height: 120px; overflow-y: auto;
    }
    .chat-input::placeholder { color: var(--text-muted); }
    .send-btn {
      width: 44px; height: 44px; border-radius: var(--radius-md); border: none;
      background: var(--accent-gradient); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: var(--transition); flex-shrink: 0; box-shadow: var(--shadow-button);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 6px 24px rgba(79,142,247,0.5); }
    .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .input-hint {
      font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; text-align: center;
    }
    .input-hint kbd {
      font-family: 'JetBrains Mono', monospace; background: rgba(255,255,255,0.06);
      border: 1px solid var(--border-subtle); border-radius: 4px;
      padding: 1px 5px; font-size: 0.66rem;
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .messages-container, .input-area { padding: 14px; }
      .chat-header { padding: 14px 16px; }
    }
  `]
})
export class AssistantComponent implements OnInit, AfterViewChecked {
  private chatSvc = inject(ChatService);

  @ViewChild('messagesContainer') private container!: ElementRef;

  private newUid(): string { return Math.random().toString(36).slice(2); }

  messages  = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  isOnline  = signal(false);
  chatId    = signal(this.newUid());
  inputText = '';
  inputFocused = false;
  private shouldScroll = false;

  historySize = () => Math.floor(this.messages().length / 2);

  capabilities = [
    { icon: '🏦', title: 'List & Inspect Accounts',   desc: 'listAccounts · getAccount' },
    { icon: '➕', title: 'Create Account',             desc: 'createAccount' },
    { icon: '🔒', title: 'Block / Activate Account',  desc: 'updateAccountStatus' },
    { icon: '📋', title: 'List Transactions',          desc: 'listTransactions · by account' },
    { icon: '💸', title: 'Transfer Money',             desc: 'transfer between accounts' },
  ];

  quickPrompts = [
    'List all accounts',
    'What is the total balance across all accounts?',
    'Show all transactions',
    'Which accounts are blocked?',
    'Transfer 500 MAD between two accounts',
    'Create a new savings account for Ahmed',
    'Show transactions for account [UUID]',
    'Block the account with the lowest balance',
  ];

  ngOnInit() {
    // Ping the info endpoint to show online status
    this.chatSvc.getInfo().subscribe({
      next: () => this.isOnline.set(true),
      error: () => this.isOnline.set(false)
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  usePrompt(prompt: string) {
    this.inputText = prompt;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading()) return;

    const userMsg: ChatMessage = { id: this.newUid(), role: 'user', content: text, timestamp: new Date() };
    const thinkingMsg: ChatMessage = { id: this.newUid(), role: 'assistant', content: '', timestamp: new Date(), isStreaming: true };

    this.messages.update(m => [...m, userMsg, thinkingMsg]);
    this.inputText = '';
    this.isLoading.set(true);
    this.shouldScroll = true;

    // Build history from previous completed turns (exclude the current thinking placeholder)
    const history = this.buildHistory();

    this.chatSvc.sendMessage(text, this.chatId(), history).subscribe({
      next: res => {
        // Update chatId from server if it changed
        if (res.chatId) this.chatId.set(res.chatId);

        this.messages.update(msgs => msgs.map(m =>
          m.id === thinkingMsg.id
            ? { ...m, content: res.response, isStreaming: false }
            : m
        ));
        this.shouldScroll = true;
      },
      error: err => {
        const errorText = err.status === 0
          ? '⚠️ Cannot reach the AI assistant. Make sure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3.2`).'
          : `⚠️ Error ${err.status}: ${err.error?.message ?? 'Unknown error from AI service.'}`;

        this.messages.update(msgs => msgs.map(m =>
          m.id === thinkingMsg.id
            ? { ...m, content: errorText, isStreaming: false }
            : m
        ));
        this.shouldScroll = true;
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  clearChat() {
    this.messages.set([]);
    this.chatId.set(this.newUid());
    this.isOnline.set(false);
    this.chatSvc.getInfo().subscribe({
      next: () => this.isOnline.set(true),
      error: () => this.isOnline.set(false)
    });
  }

  /** Convert the messages signal into ChatTurn[] for the backend history field */
  private buildHistory(): ChatTurn[] {
    return this.messages()
      .filter(m => !m.isStreaming)          // exclude the current thinking bubble
      .slice(0, -1)                         // exclude the last placeholder we just added
      .map(m => ({
        role: m.role === 'user' ? 'USER' as const : 'ASSISTANT' as const,
        content: m.content
      }));
  }

  formatMessage(content: string): string {
    return content
      .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(255,255,255,0.06);padding:12px;border-radius:8px;overflow-x:auto;font-family:JetBrains Mono,monospace;font-size:0.8rem;margin:8px 0;white-space:pre-wrap"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="font-family:JetBrains Mono,monospace;background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:0.82em">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*)/gm, '<h4 style="margin:12px 0 6px;font-size:0.9rem;color:var(--accent-primary)">$1</h4>')
      .replace(/^## (.*)/gm,  '<h3 style="margin:14px 0 8px;font-size:1rem">$1</h3>')
      .replace(/^- (.*)/gm, '<li style="margin-left:16px;margin-bottom:3px">$1</li>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
    try { const el = this.container.nativeElement; el.scrollTop = el.scrollHeight; } catch {}
  }

  // newUid is defined at the top of the class
}

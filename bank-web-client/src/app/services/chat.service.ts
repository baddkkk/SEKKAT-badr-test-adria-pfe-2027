import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatTurn {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface ChatRequest {
  message: string;
  chatId?: string;
  history?: ChatTurn[];
}

export interface ChatResponse {
  chatId: string;
  response: string;
}

export interface AssistantInfo {
  name: string;
  model: string;
  status: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private base = '/api/chat';

  constructor(private http: HttpClient) {}

  /**
   * Send a message to the agentic AI assistant.
   * Includes full conversation history for multi-turn context.
   */
  sendMessage(message: string, chatId?: string, history?: ChatTurn[]): Observable<ChatResponse> {
    const request: ChatRequest = {
      message,
      chatId,
      history: history ?? []
    };
    return this.http.post<ChatResponse>(`${this.base}/message`, request);
  }

  /** Ping the assistant info endpoint to verify it's online */
  getInfo(): Observable<AssistantInfo> {
    return this.http.get<AssistantInfo>(`${this.base}/info`);
  }
}

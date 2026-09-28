import { Injectable, signal } from '@angular/core';
import { ChatModelId, ChatTurn } from './chat.models';
export interface ChatSession {
  id: number;
  title: string;
  modelId: ChatModelId;
  turns: ChatTurn[];
  draft: string;
  conversationId: string;
  captureConversation: boolean;
}
@Injectable({ providedIn: 'root' })
export class ChatStore {
  // Intentionally memory-only: no private conversations saved to browser storage.
  readonly sessions = signal<ChatSession[]>([]);
  readonly activeId = signal<number | null>(null);
  private nextId = Date.now();
  newSession(modelId: ChatModelId): ChatSession {
    const session = { id: ++this.nextId, title: 'New chat', modelId, turns: [], draft: '', conversationId: crypto.randomUUID(), captureConversation: false };
    this.sessions.update((items) => [session, ...items]);
    this.activeId.set(session.id);
    return session;
  }
  current(): ChatSession | undefined {
    return this.sessions().find((item) => item.id === this.activeId());
  }
  save(session: ChatSession): void {
    this.sessions.update((items) =>
      items.map((item) => (item.id === session.id ? { ...session } : item)),
    );
  }
}

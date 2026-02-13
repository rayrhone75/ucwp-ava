export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: string[];
  intent?: string;
}

export interface ChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  reply: string;
  intent: string | null;
  questions: string[];
  actions: ActionItem[];
  sources: string[];
}

export interface ActionItem {
  label: string;
  url?: string;
  type: 'link' | 'info' | 'action';
}


export interface Attachment {
  name: string;
  type: string; // mime type
  data: string; // base64
  size?: number;
}

export interface Message {
  id?: number;
  projectId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  metadata?: any;
  isThinking?: boolean;
}

export interface Project {
  id?: number;
  name: string;
  createdAt: number;
  lastMessageAt: number;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export enum ModelType {
  REASONING = 'gemini-3-pro-preview',
  VISION = 'gemini-2.5-flash'
}

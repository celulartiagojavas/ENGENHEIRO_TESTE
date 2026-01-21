
export interface Attachment {
  id?: string;
  name: string;
  type: string; // mime type
  data: string; // base64
  size?: number;
}

export interface StoredBlob {
  id?: string;
  projectId: number;
  sessionId: number;
  name: string;
  type: string;
  data: string; // base64
  timestamp: number;
}

export interface Message {
  id?: number;
  projectId: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  metadata?: any;
}

export interface Session {
  id?: number;
  projectId: number;
  name: string;
  createdAt: number;
  lastActiveAt: number;
  isCommitted: boolean;
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
  VISION = 'gemini-3-flash-preview'
}

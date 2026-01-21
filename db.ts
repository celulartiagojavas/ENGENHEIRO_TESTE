
import Dexie, { Table } from 'dexie';
import { Message, Project, Session, StoredBlob } from './types';

const database = new Dexie('CivilEstimatorDBV2');

database.version(1).stores({
  projects: '++id, name, createdAt, lastMessageAt',
  sessions: '++id, projectId, name, createdAt, lastActiveAt, isCommitted',
  messages: '++id, projectId, sessionId, role, timestamp',
  blobs: '++id, projectId, sessionId, type, timestamp'
});

export const db = database as Dexie & {
  projects: Table<Project>;
  sessions: Table<Session>;
  messages: Table<Message>;
  blobs: Table<StoredBlob>;
};

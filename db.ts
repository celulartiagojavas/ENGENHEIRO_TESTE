
import Dexie, { Table } from 'dexie';
import { Message, Project } from './types';

// Using a standard instance-based approach for Dexie initialization to ensure all 
// methods like 'version' are correctly recognized by the TypeScript compiler.
const database = new Dexie('BudgetDB');

database.version(1).stores({
  messages: '++id, projectId, role, timestamp',
  projects: '++id, name, createdAt, lastMessageAt'
});

export const db = database as Dexie & {
  messages: Table<Message>;
  projects: Table<Project>;
};

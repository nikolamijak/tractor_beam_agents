/**
 * DBOS-related type definitions
 */

export interface DBOSConfig {
  database: {
    hostname: string;
    port: number;
    username: string;
    password: string;
    app_db_name: string;
    sys_db_name: string;
  };
  app: {
    name: string;
    language: string;
  };
}

export interface DBOSWorkflowHandle {
  workflowId: string;
  getResult: () => Promise<unknown>;
  getStatus: () => Promise<DBOSWorkflowStatus>;
}

export interface DBOSWorkflowStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface DBOSQueueConfig {
  name: string;
  concurrency?: number;
  retries?: number;
}

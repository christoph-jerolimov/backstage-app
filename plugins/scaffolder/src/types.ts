import type { Entity } from '@backstage-app/catalog-model';

export type JsonObject = Record<string, unknown>;

export type TemplateStep = { id?: string; name?: string; action: string };

/** A catalog entity of kind Template (`scaffolder.backstage.io/v1beta3`). */
export type TemplateEntity = Entity & {
  spec?: {
    type?: string;
    owner?: string;
    lifecycle?: string;
    parameters?: JsonObject | JsonObject[];
    steps?: TemplateStep[];
    output?: JsonObject;
  };
};

export type ParameterStep = { title: string; description?: string; schema: JsonObject };
export type ParameterSchema = { title: string; description?: string; steps: ParameterStep[] };

export type TaskStatus = 'cancelled' | 'completed' | 'failed' | 'open' | 'processing' | 'skipped';

export type TaskStep = { id: string; name: string; action: string };

export type TaskOutputLink = { title?: string; url?: string; entityRef?: string };
export type TaskOutputText = { title?: string; content?: string };
export type TaskOutput = { links?: TaskOutputLink[]; text?: TaskOutputText[] } & JsonObject;

export type ScaffolderTask = {
  id: string;
  status: TaskStatus;
  createdAt: string;
  lastHeartbeatAt?: string;
  createdBy?: string;
  spec: {
    templateInfo?: { entityRef: string; entity?: { metadata: { name: string; title?: string; namespace?: string } } };
    parameters: JsonObject;
    steps: TaskStep[];
    user?: { ref?: string };
    output?: JsonObject;
  };
  output?: TaskOutput;
};

export type TaskEventType = 'log' | 'completion' | 'cancelled' | 'recovered';

export type TaskEvent = {
  id: number;
  taskId: string;
  type: TaskEventType;
  body: { message: string; stepId?: string; status?: TaskStatus; output?: TaskOutput };
  createdAt: string;
};

export type TaskListPage = { tasks: ScaffolderTask[]; totalTasks?: number };

export type ScaffolderAction = {
  id: string;
  description?: string;
  schema?: { input?: JsonObject; output?: JsonObject };
  examples?: { description?: string; example: string; notes?: string }[];
};

export type SchemaFieldKind = 'text' | 'select' | 'number' | 'boolean' | 'list' | 'unsupported';

export type SchemaField = {
  name: string;
  title: string;
  description?: string;
  required: boolean;
  default?: unknown;
  kind: SchemaFieldKind;
  /** Choices for `select`. */
  options?: string[];
  /** For `number`: whether the schema type is integer. */
  integer?: boolean;
  /** For `unsupported`: the schema type. */
  typeLabel?: string;
};

export type FormStep = { title: string; description?: string; fields: SchemaField[] };

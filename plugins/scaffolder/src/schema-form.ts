import type { FormStep, JsonObject, ParameterSchema, SchemaField, TemplateEntity } from './types';

export type { FormStep, SchemaField };

const rec = (value: unknown): JsonObject => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {});

function schemaType(property: JsonObject): string | undefined {
  const type = property.type;
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) return type.find((item) => item !== 'null') as string | undefined;
  return undefined;
}

/** Derives the form fields of one JSON schema object (top-level `properties`). */
export function fieldsFromSchema(schema: JsonObject): SchemaField[] {
  const properties = rec(schema.properties);
  const required = new Set((Array.isArray(schema.required) ? schema.required : []).filter((item): item is string => typeof item === 'string'));

  return Object.entries(properties).map(([name, raw]) => {
    const property = rec(raw);
    const type = schemaType(property);
    const base = {
      name,
      title: typeof property.title === 'string' ? property.title : name,
      description: typeof property.description === 'string' ? property.description : undefined,
      required: required.has(name),
      default: property.default,
    };
    if (Array.isArray(property.enum)) {
      return { ...base, kind: 'select' as const, options: property.enum.map(String) };
    }
    if (type === 'string') return { ...base, kind: 'text' as const };
    if (type === 'number' || type === 'integer') return { ...base, kind: 'number' as const, integer: type === 'integer' };
    if (type === 'boolean') return { ...base, kind: 'boolean' as const };
    if (type === 'array' && schemaType(rec(property.items)) === 'string') return { ...base, kind: 'list' as const };
    return { ...base, kind: 'unsupported' as const, typeLabel: type ?? 'unknown' };
  });
}

export function formStepsFromSchema(schema: ParameterSchema): FormStep[] {
  return schema.steps.map((step, index) => ({
    title: step.title || `Step ${index + 1}`,
    description: step.description,
    fields: fieldsFromSchema(step.schema),
  }));
}

/** Builds the parameter schema from a template entity's `spec.parameters` (demo mode). */
export function parameterSchemaFromTemplate(template: TemplateEntity): ParameterSchema {
  const parameters = template.spec?.parameters;
  const steps = (Array.isArray(parameters) ? parameters : parameters ? [parameters] : []).map((step, index) => ({
    title: typeof step.title === 'string' ? step.title : `Step ${index + 1}`,
    description: typeof step.description === 'string' ? step.description : undefined,
    schema: step,
  }));
  return { title: template.metadata.title ?? template.metadata.name, description: template.metadata.description, steps };
}

/** Raw form state: strings for text/select/number/list inputs, booleans for switches. */
export type FormValues = Record<string, string | boolean | undefined>;

function rawDefault(field: SchemaField): string | boolean | undefined {
  const value = field.default;
  if (field.kind === 'boolean') return value === true;
  if (field.kind === 'list') return Array.isArray(value) ? value.map(String).join(', ') : typeof value === 'string' ? value : '';
  if (value === undefined || value === null) return '';
  return String(value);
}

export function initialValues(steps: FormStep[]): FormValues {
  const values: FormValues = {};
  for (const step of steps) for (const field of step.fields) values[field.name] = rawDefault(field);
  return values;
}

export function isFieldFilled(field: SchemaField, value: string | boolean | undefined): boolean {
  if (field.kind === 'boolean') return true;
  return typeof value === 'string' && value.trim() !== '';
}

/** True when every required, supported field has a value. */
export function isComplete(steps: FormStep[], values: FormValues): boolean {
  return steps.every((step) => step.fields.every((field) => !field.required || field.kind === 'unsupported' || isFieldFilled(field, values[field.name])));
}

/** Converts raw form state into the task's parameter values. */
export function submitValues(steps: FormStep[], values: FormValues): JsonObject {
  const out: JsonObject = {};
  for (const step of steps) {
    for (const field of step.fields) {
      const raw = values[field.name];
      if (field.kind === 'unsupported') continue;
      if (field.kind === 'boolean') {
        out[field.name] = raw === true;
        continue;
      }
      if (typeof raw !== 'string' || raw.trim() === '') continue;
      if (field.kind === 'number') {
        const parsed = field.integer ? Number.parseInt(raw, 10) : Number(raw);
        if (!Number.isNaN(parsed)) out[field.name] = parsed;
        continue;
      }
      if (field.kind === 'list') {
        out[field.name] = raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        continue;
      }
      out[field.name] = raw.trim();
    }
  }
  return out;
}

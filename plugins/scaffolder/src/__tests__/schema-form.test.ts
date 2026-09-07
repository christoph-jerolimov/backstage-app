import { demoEntities } from '@backstage-app/plugin-catalog';

import { fieldsFromSchema, formStepsFromSchema, initialValues, isComplete, parameterSchemaFromTemplate, submitValues } from '../schema-form';
import type { TemplateEntity } from '../types';

const template = demoEntities.find((entity) => entity.metadata.name === 'nodejs-service') as TemplateEntity;

describe('schema form', () => {
  it('derives fields with kinds, titles, defaults, and required markers', () => {
    const fields = fieldsFromSchema({
      required: ['name'],
      properties: {
        name: { title: 'Name', type: 'string', description: 'Unique' },
        visibility: { type: 'string', enum: ['public', 'private'], default: 'private' },
        replicas: { type: 'integer', default: 1 },
        ratio: { type: ['number', 'null'] },
        monitoring: { type: 'boolean', default: true },
        regions: { type: 'array', items: { type: 'string' } },
        labels: { type: 'object' },
      },
    });

    expect(fields.map((field) => [field.name, field.kind, field.required])).toEqual([
      ['name', 'text', true],
      ['visibility', 'select', false],
      ['replicas', 'number', false],
      ['ratio', 'number', false],
      ['monitoring', 'boolean', false],
      ['regions', 'list', false],
      ['labels', 'unsupported', false],
    ]);
    expect(fields[0]).toMatchObject({ title: 'Name', description: 'Unique' });
    expect(fields[1]).toMatchObject({ title: 'visibility', options: ['public', 'private'], default: 'private' });
    expect(fields[2].integer).toBe(true);
    expect(fields[6].typeLabel).toBe('object');
  });

  it('builds steps from a template entity and tracks completeness', () => {
    const schema = parameterSchemaFromTemplate(template);
    expect(schema.title).toBe('Node.js service');
    expect(schema.steps.map((step) => step.title)).toEqual(['Service details', 'Deployment']);

    const steps = formStepsFromSchema(schema);
    const values = initialValues(steps);
    expect(values).toEqual({ name: '', description: '', owner: 'team-platform', visibility: 'private', replicas: '1', monitoring: true, regions: 'eu-west-1' });
    expect(isComplete(steps, values)).toBe(false);
    expect(isComplete(steps, { ...values, name: 'orders' })).toBe(true);

    expect(submitValues(steps, { ...values, name: ' orders ', replicas: '3', regions: 'eu-west-1, us-east-1,' , description: '' })).toEqual({
      name: 'orders',
      owner: 'team-platform',
      visibility: 'private',
      replicas: 3,
      monitoring: true,
      regions: ['eu-west-1', 'us-east-1'],
    });
  });

  it('handles a single-object parameter schema and unsupported fields', () => {
    const docs = demoEntities.find((entity) => entity.metadata.name === 'docs-site') as TemplateEntity;
    const steps = formStepsFromSchema(parameterSchemaFromTemplate(docs));
    expect(steps).toHaveLength(1);
    expect(steps[0].fields.map((field) => field.name)).toEqual(['name', 'language']);

    const withObject = formStepsFromSchema({ title: 'x', steps: [{ title: 's', schema: { required: ['labels'], properties: { labels: { type: 'object' } } } }] });
    expect(isComplete(withObject, initialValues(withObject))).toBe(true);
    expect(submitValues(withObject, initialValues(withObject))).toEqual({});
  });
});

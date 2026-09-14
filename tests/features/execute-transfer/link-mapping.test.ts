import { describe, expect, test } from 'vitest';
import { assertDestinationLinkMapping } from '../../../src/features/execute-transfer/link-mapping.js';

function valid() {
  return {
    mapping_definition: { columns: { id: 'source_id', tenant: 'source_tenant', amount: 'amount' } },
    destination_columns: { columns: [{ name: 'id' }, { name: 'tenant' }, { name: 'amount' }] },
    destination_key_columns: ['tenant', 'id'],
    destination_key_mapping: {
      sourceKey: ['source_tenant', 'source_id'],
      destinationKey: [
        { name: 'id', sourceColumn: 'source_id' },
        { name: 'tenant', sourceColumn: 'source_tenant' },
      ],
    },
  };
}
const columns = ['source_tenant', 'source_id'];

describe('loaded Destination Link mapping', () => {
  test('accepts composite destination keys in a different order without changing inputs', () => {
    const link = valid();
    const before = structuredClone(link);
    assertDestinationLinkMapping(link, columns);
    expect(link).toEqual(before);
    expect(columns).toEqual(['source_tenant', 'source_id']);
  });

  test.each([
    ['null mapping', { mapping_definition: null }],
    ['array mapping', { mapping_definition: { columns: [] } }],
    ['empty mapping', { mapping_definition: { columns: {} } }],
    ['unknown target', { mapping_definition: { columns: { absent: 'amount' } } }],
    ['empty source', { mapping_definition: { columns: { id: '' } } }],
    ['non-string source', { mapping_definition: { columns: { id: 1 } } }],
    ['missing destination columns', { destination_columns: null }],
    ['missing key mapping', { destination_key_mapping: null }],
    [
      'empty destination key',
      { destination_key_mapping: { sourceKey: columns, destinationKey: [] } },
    ],
    [
      'non-array destination key',
      { destination_key_mapping: { sourceKey: columns, destinationKey: {} } },
    ],
    ['different destination keys', { destination_key_columns: ['id'] }],
    [
      'wrong source order',
      {
        destination_key_mapping: {
          ...valid().destination_key_mapping,
          sourceKey: [...columns].reverse(),
        },
      },
    ],
    [
      'wrong mapped key source',
      { mapping_definition: { columns: { ...valid().mapping_definition.columns, id: 'other' } } },
    ],
  ])('rejects %s', (_name, patch) => {
    expect(() => assertDestinationLinkMapping({ ...valid(), ...patch }, columns)).toThrow(
      'Invalid Destination Link mapping',
    );
  });

  test('does not normalize malformed destination column containers during refactoring', () => {
    expect(() =>
      assertDestinationLinkMapping({ ...valid(), destination_columns: { columns: {} } }, columns),
    ).toThrow(TypeError);
  });

  test('does not normalize malformed destination key entries during refactoring', () => {
    expect(() =>
      assertDestinationLinkMapping(
        { ...valid(), destination_key_mapping: { sourceKey: columns, destinationKey: [null] } },
        columns,
      ),
    ).toThrow(TypeError);
  });
});

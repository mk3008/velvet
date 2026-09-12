import { expect, test } from 'vitest';
import { bindStoredSql } from '../trusted-sql.js';

test('binds repeated names in SQL order without embedding values', () => {
  expect(bindStoredSql('select :a::text, :b, :a', { b: null, a: "'; drop table x;--" })).toEqual({
    text: 'select $1::text, $2, $1',
    names: ['a', 'b'],
    values: ["'; drop table x;--", null],
  });
});
test('leaves quoted text, comments, casts and dollar bodies intact', () => {
  const text = `select ':skip', "x:skip", $$:skip$$, $tag$:skip$tag$, :value::jsonb /* :skip /* nested */ */ -- :skip\n`;
  expect(bindStoredSql(text, { value: {} }).text).toBe(text.replace(':value', '$1'));
});
test('handles escaped E strings and doubled quote escaping', () => {
  const text = String.raw`select E'quote\':skip', 'a'':skip', :value`;
  expect(bindStoredSql(text, { value: 1 }).values).toEqual([1]);
});
test.each([
  'select :missing',
  'select $1',
  "select 'unfinished",
  'select /* unfinished',
  'select $q$unfinished',
])('rejects invalid binding source %s', (text) => {
  expect(() => bindStoredSql(text, {})).toThrow();
});
test('rejects inherited and undefined values', () => {
  expect(() => bindStoredSql('select :x', Object.create({ x: 1 }))).toThrow();
  expect(() => bindStoredSql('select :x', { x: undefined })).toThrow();
});

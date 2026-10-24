import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareJson, jsonPath } from './json-core.mjs';

test('the visible footer version matches package metadata', async () => {
  const [{ version }, html] = await Promise.all([
    readFile(new URL('./package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('./index.html', import.meta.url), 'utf8'),
  ]);
  assert.match(html, new RegExp(`<span id="version">v${version.replaceAll('.', '\\.')}</span>`));
});

test('formats paths for identifiers, array indices, and unusual keys', () => {
  assert.equal(jsonPath(['users', 0, 'email']), '$.users[0].email');
  assert.equal(jsonPath(['user name', 'a"b']), '$["user name"]["a\\"b"]');
});

test('reports added, removed, and changed values at exact nested paths', () => {
  const changes = compareJson(
    { users: [{ name: 'Ada', active: true }], gone: 1 },
    { users: [{ name: 'Grace', active: true, role: 'admin' }], added: null },
  );
  assert.deepEqual(changes, [
    { kind: 'changed', path: ['users', 0, 'name'], before: 'Ada', after: 'Grace' },
    { kind: 'added', path: ['users', 0, 'role'], after: 'admin' },
    { kind: 'removed', path: ['gone'], before: 1 },
    { kind: 'added', path: ['added'], after: null },
  ]);
});

test('treats structurally equal objects as unchanged regardless of key order', () => {
  assert.deepEqual(compareJson({ b: 2, a: 1 }, { a: 1, b: 2 }), []);
});

test('reports a root primitive change with an empty path', () => {
  assert.deepEqual(compareJson(1, 2), [{ kind: 'changed', path: [], before: 1, after: 2 }]);
});

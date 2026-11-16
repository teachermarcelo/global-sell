import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCommitBody,
  FirestoreQuotaError,
  isQuotaError,
  parseFirestoreRestError,
  toFirestoreValue,
} from './firestoreRest.ts';

test('toFirestoreValue encodes primitives, arrays, maps, and skips undefined fields', () => {
  const encoded = toFirestoreValue({
    title: 'Katori',
    count: 5,
    price: 19.9,
    active: true,
    empty: null,
    skipped: undefined,
    tags: ['a', 'b', undefined],
  });

  assert.deepEqual(encoded, {
    mapValue: {
      fields: {
        title: { stringValue: 'Katori' },
        count: { integerValue: '5' },
        price: { doubleValue: 19.9 },
        active: { booleanValue: true },
        empty: { nullValue: null },
        tags: {
          arrayValue: {
            values: [{ stringValue: 'a' }, { stringValue: 'b' }],
          },
        },
      },
    },
  });
});

test('buildCommitBody produces valid Firestore REST writes with REQUEST_TIME transforms', () => {
  const body = buildCommitBody(
    [
      {
        path: 'pages/page_123',
        data: { ownerId: 'u1', title: 'Test', createdAt: 'ignored', updatedAt: 'ignored' },
        serverTimestampFields: ['createdAt', 'updatedAt'],
        exists: false,
      },
    ],
    'proj-1',
    'db-1'
  );

  assert.equal(body.writes.length, 1);
  const w = body.writes[0] as Record<string, unknown>;
  assert.deepEqual(w.currentDocument, { exists: false });
  assert.deepEqual(w.updateTransforms, [
    { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
    { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
  ]);
  assert.deepEqual(w.update, {
    name: 'projects/proj-1/databases/db-1/documents/pages/page_123',
    fields: {
      ownerId: { stringValue: 'u1' },
      title: { stringValue: 'Test' },
    },
  });
});

test('buildCommitBody adds updateMask on partial updates (exists: true) and skips serverTimestamp fields from mask', () => {
  const body = buildCommitBody(
    [
      {
        path: 'pages/page_123',
        data: { title: 'Updated Title', status: 'published', updatedAt: 'ignored' },
        serverTimestampFields: ['updatedAt'],
        exists: true,
      },
    ],
    'proj-1',
    'db-1'
  );

  assert.equal(body.writes.length, 1);
  const w = body.writes[0] as Record<string, unknown>;
  assert.deepEqual(w.currentDocument, { exists: true });
  assert.deepEqual(w.updateMask, { fieldPaths: ['title', 'status'] });
  assert.deepEqual(w.updateTransforms, [
    { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
  ]);
});

test('parseFirestoreRestError detects RESOURCE_EXHAUSTED quota exhaustion cleanly', () => {
  const err = parseFirestoreRestError(
    429,
    JSON.stringify({
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'Quota exceeded for quota metric Free daily write units per project',
      },
    })
  );
  assert.ok(err instanceof FirestoreQuotaError);
  assert.ok(isQuotaError(err));
  assert.match(err.message, /Cota diária gratuita/);
});

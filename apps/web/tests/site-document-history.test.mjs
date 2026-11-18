import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_SITE_DOCUMENTS } from '../src/lib/site-documents.ts';
import { fetchPublishedDocumentRevisions, validRevisionId } from '../src/lib/site-document-history.ts';

test('migration preserves both current legal defaults exactly, without substituting new policy text', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/20261118093452_site_document_history_publication.sql', import.meta.url), 'utf8');
  const seeds = [...sql.matchAll(/content = \$initial\$([\s\S]*?)\$initial\$[\s\S]*?WHERE id = '([^']+)'/g)];
  assert.equal(seeds.length, 2);
  for (const [, content, id] of seeds) assert.equal(content, DEFAULT_SITE_DOCUMENTS[id]);
});

test('public history fetches only selected snapshots without caching or author metadata', async (t) => {
  const previous = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture';
  t.after(() => { for (const [i, key] of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()) { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; } });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push([new URL(url), options]); return Response.json([]); });
  assert.deepEqual(await fetchPublishedDocumentRevisions('terms-of-service', { revisionId: '17' }), { revisions: [], hasMore: false });
  assert.equal(calls[0][0].pathname, '/rest/v1/site_document_published_revisions');
  assert.equal(calls[0][0].searchParams.get('document_id'), 'eq.terms-of-service');
  assert.equal(calls[0][0].searchParams.get('revision_id'), 'eq.17');
  assert.equal(calls[0][1].cache, 'no-store');
  assert(!calls[0][0].searchParams.get('select').includes('saved_by'));
  await fetchPublishedDocumentRevisions('privacy-policy', { before: '18' });
  assert.equal(calls[1][0].searchParams.get('revision_id'), 'lt.18');
  assert(!calls[1][0].searchParams.get('select').includes('content'));
});

test('failed public reads are errors; malformed revision paths are rejected', async (t) => {
  const previous = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture';
  t.after(() => { for (const [i, key] of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()) { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; } });
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  await assert.rejects(fetchPublishedDocumentRevisions('terms-of-service'));
  for (const id of ['0', '-1', '1.2', 'abc', '1,2', '1&select=*', '9999999999999999']) assert.equal(validRevisionId(id), undefined);
  assert.equal(validRevisionId('17'), '17');
});

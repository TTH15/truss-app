import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventChatLinks, parseEventChatLink, normalizeEventChatLink } from '../src/event-chat-links.ts';

test('LINEとInstagramの招待リンクを別々に表示し、旧LINE欄のInstagramにも対応する', () => {
  const line = 'https://line.me/ti/g/fixture';
  const instagram = 'https://ig.me/j/fixture';
  assert.deepEqual(getEventChatLinks({ lineGroupLink: line, instagramGroupLink: instagram }), [{ service: 'line', url: line }, { service: 'instagram', url: instagram }]);
  assert.deepEqual(getEventChatLinks({ lineGroupUrl: line }), [{ service: 'line', url: line }]);
  assert.deepEqual(getEventChatLinks({ lineGroupLink: instagram, instagramGroupLink: instagram }), [{ service: 'instagram', url: instagram }]);
  assert.deepEqual(getEventChatLinks({ lineGroupLink: 'https://ig.me/j/old', instagramGroupLink: instagram }), [{ service: 'instagram', url: instagram }]);
  assert.equal(getEventChatLinks({}).length, 0);
});

test('空白とスキーム省略を補正し、招待コードやクエリは保持する', () => {
  assert.equal(normalizeEventChatLink('  line.me/ti/g/CaseSensitive?x=AbC  ', 'line'), 'https://line.me/ti/g/CaseSensitive?x=AbC');
  assert.equal(normalizeEventChatLink(' https://www.instagram.com/direct/join/AbC ', 'instagram'), 'https://www.instagram.com/direct/join/AbC');
  assert.equal(normalizeEventChatLink('', 'line'), '');
  assert.equal(normalizeEventChatLink(undefined, 'instagram'), '');
});

test('スクリプトURL、偽ドメイン、認証情報、不正なプロトコルと別サービスを保存しない', () => {
  for (const raw of ['javascript:alert(1)', 'data:text/html,test', 'http://line.me/ti/g/test', 'https://line.me.evil.invalid/ti/g/x', 'https://line.me@evil.invalid/x', 'https://user:password@line.me/ti/g/x', 'https://instagram.com:8443/x', 'bad']) {
    assert.equal(parseEventChatLink(raw), null, raw);
    assert.throws(() => normalizeEventChatLink(raw, 'line'));
  }
  assert.throws(() => normalizeEventChatLink('https://ig.me/j/test', 'line'));
});

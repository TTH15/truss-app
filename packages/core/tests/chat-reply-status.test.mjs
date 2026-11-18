import test from 'node:test';
import assert from 'node:assert/strict';
import { needsChatReply, unrepliedDays } from '../src/chat-reply-status.ts';
const message = (id, isAdmin, extra = {}) => ({id,isAdmin,text:'お問い合わせ',time:'2026-11-18T08:00:00Z',senderId:'fixture',senderName:'Fixture',...extra});
test('未読と未返信を分け、既読にしても返信するまで未返信を保持する', () => {
  assert.equal(needsChatReply([]),false);
  assert.equal(needsChatReply([message(1,false,{read:false})]),true);
  assert.equal(needsChatReply([message(1,false,{read:true})]),true);
  assert.equal(needsChatReply([message(1,false),message(2,true)]),false);
  assert.equal(needsChatReply([message(1,false),message(2,true),message(3,false)]),true);
});
test('自動承認通知・再提出依頼・一斉送信は返信に数えない', () => {
  for(const notification of [message(2,true,{isAutomated:true}),message(2,true,{isBroadcast:true}),message(2,true,{text:'登録が承認されました。Truss へようこそ！通知'}),message(2,true,{text:'学生証の再アップロードをお願いします。理由:テスト'})]) {
    assert.equal(needsChatReply([message(1,false),notification]),true);
    assert.equal(needsChatReply([notification]),false);
  }
  assert.equal(needsChatReply([message(3,false,{isAutomated:true,isBroadcast:true})]),true);
});
test('日時とIDで判定し、並び替え前の入力や過去ページの追加で状態を変えない', () => {
  assert.equal(needsChatReply([message(5,true),message(1,false)]),false);
  assert.equal(needsChatReply([message(5,true),message(1,false,{time:'2026-11-18T09:00:00Z'})]),true);
});

test('未返信日数は24時間単位で数え、不正日時や未来を負数にしない', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  assert.equal(unrepliedDays('2026-11-16T12:00:00Z', now), 2);
  assert.equal(unrepliedDays('2026-11-17T12:00:01Z', now), 0);
  assert.equal(unrepliedDays('2026-11-19T12:00:00Z', now), 0);
  assert.equal(unrepliedDays('invalid', now), 0);
});

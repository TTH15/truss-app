-- chat-attachmentsバケットは元々画像専用のMIMEタイプ制限（image/jpeg等）で作成されていたが、
-- チャットにはファイル添付・ボイスメッセージ（audio/x-m4a等）も送れるため、制限を撤廃する。
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'chat-attachments';

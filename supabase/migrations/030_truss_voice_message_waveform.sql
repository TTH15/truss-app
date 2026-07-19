-- ボイスメッセージの波形表示用に、録音中に収集した音量サンプル（0〜1の数値配列）を保存する列を追加。
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_waveform jsonb;

COMMENT ON COLUMN public.messages.attachment_waveform IS 'ボイスメッセージの波形表示用の音量サンプル配列（0〜1、固定本数に間引き済み）';

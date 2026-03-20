// 共通翻訳ユーティリティ
export const translateText = async (text: string, targetLang: string = 'en'): Promise<string> => {
  if (!text.trim()) return '';
  
  try {
    // Google Translate APIを使用（無料版）
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // レスポンスから翻訳テキストを抽出
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    throw new Error('Translation failed');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

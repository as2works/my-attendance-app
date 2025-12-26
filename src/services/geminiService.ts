
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateHistoryMessage = async (
  userName: string,
  changes: { date: string; oldStatus: string; newStatus: string }[]
): Promise<string> => {
  if (changes.length === 0) return `${userName}さんが予定を確認しました。`;

  try {
    // 以前のステータスがすべて「-」または空だった場合は新規入力とみなす
    const isNewInput = changes.every(c => c.oldStatus === '-' || !c.oldStatus);
    
    // 日付順にソート
    const sortedChanges = [...changes].sort((a, b) => a.date.localeCompare(b.date));
    
    const changeDetails = sortedChanges
      .map(c => {
        const d = new Date(c.date);
        return `${d.getMonth() + 1}月${d.getDate()}日：${c.oldStatus}→${c.newStatus}`;
      })
      .join('\n');

    const prompt = `
季節労働者の出勤予定変更履歴メッセージを以下のルールで作成してください。

ユーザー名: ${userName}
変更の種類: ${isNewInput ? '新規入力' : '変更'}
変更件数: ${changes.length}件
詳細リスト:
${changeDetails}

## 出力形式のルール:
1. 【新規入力】の場合（全ての変更前ステータスが「-」だった場合）:
   形式: 「${userName}さんが予定を新規入力しました。（[開始日]～[終了日]）」
   ※開始日と終了日は詳細リストの最初と最後の日付（例: 1月1日）を使用してください。

2. 【予定変更】の場合（既存の予定が更新された場合）:
   形式:
   「${userName}さんが予定を変更しました。
   　　[日付]：[旧ステータス]→[新ステータス]
   　　[日付]：[旧ステータス]→[新ステータス]
      ...」
   ※各変更行は改行し、行頭に全角スペースを入れてください。
   ※重要：変更件数に関わらず、詳細リストにある全ての日付の変更を省略せずに出力してください。「等、計〇件」のような要約は行わないでください。

余計な解説や「はい、承知しました」などの返答は一切含まず、メッセージ本体のみを出力してください。
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || `${userName}さんが予定を更新しました。`;
  } catch (error) {
    console.error("Gemini Error:", error);
    // フォールバック用のシンプルなメッセージ生成
    if (changes.length === 0) return `${userName}さんが予定を更新しました。`;
    const sorted = [...changes].sort((a, b) => a.date.localeCompare(b.date));
    const start = new Date(sorted[0].date);
    const end = new Date(sorted[sorted.length - 1].date);
    return `${userName}さんが予定を更新しました。（${start.getMonth()+1}/${start.getDate()}〜${end.getMonth()+1}/${end.getDate()}）`;
  }
};

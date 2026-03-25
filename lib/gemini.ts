import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

function buildPrompt(guidelines: string, ngWords: string): string {
  return `
あなたはプロの映像校正者です。この動画に表示されるテロップ（字幕）の誤字脱字を検出してください。

【重要：検出方法】
テロップを「読む」のではなく、一文字ずつ「見て」ください。
人間はテキストを読むとき、脳が自動的に誤字を補正してしまいます。あなたも同じです。
そのため、各テロップを以下の手順で検査してください：

1. テロップが表示されているフレームを見つける。
2. テロップの文字を、左から右へ「一文字ずつ」視覚的に確認する。
   - 各文字の「形」に注目する。似た文字を混同しないこと。
   - 例：「く」と「こ」、「い」と「っ」、「は」と「ほ」、「り」と「い」
3. 確認した文字列を組み立て、日本語として正しいかどうか判定する。
4. 正しくない場合、それは誤字です。

【検出すべき誤り】
- ひらがな・カタカナの打ち間違い（例：「よろしこお願いします」→正しくは「よろしくお願いします」）
- 漢字の誤変換（例：「危機一髪」→「危機一発」※文脈による）
- 送り仮名の誤り（例：「テロプ」→「テロップ」）
- 助詞の間違い（例：「私わ」→「私は」）
- 同音異義語の選択ミス

【誤検出を防ぐルール】
- 以下は演出・表現として許容し、エラーとして報告しないこと：
  - YouTubeスラング（「草」「w」「マジで」「ガチで」等）
  - 口語表現（「〜してる」「〜だよね」等）
  - 強調表現（「すごーい」「めっちゃ」等）
- 指摘する際は、該当フレームを再度確認し、本当にその文字が表示されているか二重チェックすること。
- 「current_text」には画面に実際に表示されている文字列をそのまま入れること。自分で修正した文字列を入れないこと。

【ガイドライン】
${guidelines || "なし"}

【NGワード（含まれている場合は severity を「error」として報告）】
${ngWords || "なし"}

【出力フォーマット】
有効なJSON配列のみを返してください。誤字脱字が見つからない場合は空配列 [] を返してください。
文字列内の " は必ず \" にエスケープしてください。
[
  {
    "timecode": "MM:SS",
    "current_text": "画面に実際に表示されている文字列（誤字を含むそのまま）",
    "suggested_text": "修正後の正しい文字列",
    "reason": "修正理由を具体的に説明",
    "severity": "error または warning",
    "confidence": 0.0から1.0の数値
  }
]
`;
}

export const analyzeVideo = async (
  videoPath: string,
  modelName: string,
  guidelines: string,
  ngWords: string
) => {
  const uploadResponse = await fileManager.uploadFile(videoPath, {
    mimeType: "video/mp4",
    displayName: "Analysis Video",
  });

  let file = await fileManager.getFile(uploadResponse.file.name);
  let interval = 2000;
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(Math.round(interval * 1.5), 10000);
    file = await fileManager.getFile(uploadResponse.file.name);
  }

  if (file.state === "FAILED") {
    throw new Error("動画の処理に失敗しました。");
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent([
    { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    { text: buildPrompt(guidelines, ngWords) },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { results: [] };

  const rawResults = JSON.parse(jsonMatch[0]);
  const results = rawResults.map((r: any) => ({
    ...r,
    confidence: typeof r.confidence === "number" ? r.confidence : 0.5,
  }));

  return { results };
};

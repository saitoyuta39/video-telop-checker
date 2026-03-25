import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

async function uploadToGemini(file: File) {
  const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`;
  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": file.size.toString(),
      "X-Goog-Upload-Header-Content-Type": file.type,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });

  if (!initResponse.ok) {
    const errorData = await initResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to initialize upload");
  }

  const uploadUrl = initResponse.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("Failed to get upload URL");

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: file,
  });

  const data = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(data.error?.message || "Upload failed");
  
  return data.file;
}

async function waitForFileProcessing(fileUri: string) {
  const fileId = fileUri.split("/").pop();
  const getUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${API_KEY}`;

  let interval = 2000;
  while (true) {
    const response = await fetch(getUrl);
    const data = await response.json();
    
    if (data.state === "ACTIVE") return data;
    if (data.state === "FAILED") throw new Error("Video processing failed at Google side");
    
    await new Promise(resolve => setTimeout(resolve, interval));
    interval = Math.min(Math.round(interval * 1.5), 10000);
  }
}

export type AnalysisProgressPhase = "uploading" | "processing" | "analyzing" | "done";

export interface AnalysisResult {
  timecode: string;
  current_text: string;
  suggested_text: string;
  reason: string;
  severity: "error" | "warning";
  confidence: number;
}

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

export const analyzeVideoClient = async (
  videoFile: File,
  modelName: string,
  guidelines: string,
  ngWords: string,
  onProgress?: (phase: AnalysisProgressPhase) => void
) => {
  onProgress?.("uploading");
  const uploadedFile = await uploadToGemini(videoFile);
  
  onProgress?.("processing");
  const activeFile = await waitForFileProcessing(uploadedFile.uri);

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

  onProgress?.("analyzing");
  const result = await model.generateContent([
    { fileData: { mimeType: activeFile.mimeType, fileUri: activeFile.uri } },
    { text: buildPrompt(guidelines, ngWords) },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { results: [] };

  const rawResults: AnalysisResult[] = JSON.parse(jsonMatch[0]);

  const results = rawResults.map((r) => ({
    ...r,
    confidence: typeof r.confidence === "number" ? r.confidence : 0.5,
  }));

  onProgress?.("done");

  return { results };
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * ブラウザから直接Google Gemini File APIに動画をアップロードする
 */
async function uploadToGemini(file: File) {
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`;
  
  // 1. アップロードの初期化と実行（Simple Upload）
  // 注意: 本来はResumable Uploadが望ましいが、実装の単純化のためfetchで直接送る方式をとる
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "multipart",
    },
    body: createMultipartBody(file),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Upload failed");
  
  return data.file;
}

/**
 * マルチパートボディを作成（REST API用）
 */
function createMultipartBody(file: File) {
  const boundary = "-------Boundary" + Math.random().toString(16).slice(2);
  const metadata = JSON.stringify({ file: { display_name: file.name } });
  
  const header = 
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;

  // Blobを使用してバイナリデータを結合
  return new Blob([header, file, footer], { type: `multipart/related; boundary=${boundary}` });
}

/**
 * ファイルの処理状態を確認する
 */
async function waitForFileProcessing(fileUri: string) {
  const fileId = fileUri.split("/").pop();
  const getUrl = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${API_KEY}`;

  while (true) {
    const response = await fetch(getUrl);
    const data = await response.json();
    
    if (data.state === "ACTIVE") return data;
    if (data.state === "FAILED") throw new Error("Video processing failed at Google side");
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
  }
}

export const analyzeVideoClient = async (
  videoFile: File,
  modelName: string,
  guidelines: string,
  ngWords: string
) => {
  // 1. 動画を直接アップロード
  const uploadedFile = await uploadToGemini(videoFile);
  
  // 2. 処理完了を待機
  const activeFile = await waitForFileProcessing(uploadedFile.uri);

  // 3. 解析モデルの準備
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  const prompt = `
あなたはプロの動画編集・校正者です。動画内のテロップ（字幕）の誤字脱字を、以下の手順に従って極めて正確に検出してください。
音声との一致確認は不要です。テロップの文字情報のみに集中して、日本語としての正しさをチェックしてください。

【解析手順（ステップ・バイ・ステップ）】
1. **テロップの走査**: 動画全体を1フレームずつ確認し、画面上に表示される「全てのテロップ（字幕）」をまず頭の中で正確にリストアップしてください。
2. **文字の読み取り（OCR）**: 各テロップの文字を、誤字も含めてそのまま一字一句正確に読み取ってください。テロップが小さい、あるいは色が背景と近い場合でも、注視して正確な情報を抽出してください。
3. **誤字脱字の判定**: 読み取った文字を以下の基準で精査してください。
    - 明らかな誤変換（例：「自身」→「地震」※文脈による）
    - 送り仮名のミス、タイポ（例：「テロプ」→「テロップ」）
    - 助詞の誤り（例：「私わ」→「私は」）
4. **YouTube特有の表現の除外**: 「草」「w」「www」「マジで」「ガチで」などのスラングや崩し文字は演出として許容し、エラーから除外してください。

【解析の優先順位】
1. **タイムコードの正確性**: 指摘する箇所のタイムコード（分:秒）を正確に特定してください。
2. **テロップの誤字脱字**: 特に漢字の誤用や、同音異義語の選択ミスを逃さず検出してください。

【ガイドライン】
${guidelines}

【NGワード（含まれている場合は「error」として報告）】
${ngWords}

【出力フォーマット】
必ず以下のJSON配列形式のみで回答してください。
[
  {
    "timecode": "MM:SS",
    "current_text": "動画内の実際のテロップ内容",
    "suggested_text": "修正後の正しいテロップ内容",
    "reason": "なぜ修正が必要なのかを具体的に説明（例：漢字の変換ミス、送り仮名の誤り等）",
    "severity": "error" | "warning"
  }
]
`;

  // 4. 解析の実行
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: activeFile.mimeType,
        fileUri: activeFile.uri,
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { results: [] };

  return { results: JSON.parse(jsonMatch[0]) };
};

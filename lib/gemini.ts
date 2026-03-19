import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

export const analyzeVideo = async (
  videoPath: string,
  modelName: string,
  guidelines: string,
  ngWords: string
) => {
  // 1. 動画ファイルをアップロード
  const uploadResponse = await fileManager.uploadFile(videoPath, {
    mimeType: "video/mp4",
    displayName: "Analysis Video",
  });

  // 2. アップロード完了を待機
  let file = await fileManager.getFile(uploadResponse.file.name);
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    file = await fileManager.getFile(uploadResponse.file.name);
  }

  if (file.state === "FAILED") {
    throw new Error("動画の処理に失敗しました。");
  }

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
    "severity": "error"（明らかな間違い） | "warning"（推奨される修正）
  }
]
`;

  // 4. 解析の実行
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri,
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();
  
  // JSON部分のみを抽出（```json ... ``` の中身）
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { results: [] };
  }

  return { results: JSON.parse(jsonMatch[0]) };
};

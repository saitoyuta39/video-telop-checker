import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const config = {
  api: {
    bodyParser: false, // フォームデータを扱うため
  },
};

export const maxDuration = 60; // Vercelのタイムアウトを延長 (Pro/Hobbyプランにより上限が異なります)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const video = formData.get("video") as File;
    const model = (formData.get("model") as string) || "gemini-3-flash-preview";
    const guidelines = (formData.get("guidelines") as string) || "なし";
    const ngWords = (formData.get("ngWords") as string) || "なし";

    if (!video) {
      return NextResponse.json({ error: "動画ファイルが必要です。" }, { status: 400 });
    }

    // ファイルを一時保存
    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), `${Date.now()}-${video.name}`);
    await writeFile(tempPath, buffer);

    try {
      const results = await analyzeVideo(tempPath, model, guidelines, ngWords);
      return NextResponse.json(results);
    } finally {
      // 一時ファイルを削除
      await unlink(tempPath).catch(() => {});
    }
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json(
      { error: "解析に失敗しました。: " + error.message },
      { status: 500 }
    );
  }
}

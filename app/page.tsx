"use client";

import { useState, useRef } from "react";
import VideoUploader from "@/components/VideoUploader";
import GuidelineForm from "@/components/GuidelineForm";
import AnalysisResults from "@/components/AnalysisResults";
import { Sparkles, Settings2, Video as VideoIcon } from "lucide-react";
import { analyzeVideoClient, type AnalysisProgressPhase } from "@/lib/gemini-client";

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [model, setModel] = useState<"gemini-3.1-pro-preview" | "gemini-3-flash-preview">("gemini-3-flash-preview");
  const [guidelines, setGuidelines] = useState("");
  const [ngWords, setNgWords] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisProgressPhase | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleTimestampClick = (timecode: string) => {
    if (!videoRef.current) return;
    
    const parts = timecode.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
    videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setError("APIキーが設定されていません。.env.local ファイルを確認してください。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisPhase(null);
    setError(null);
    setResults(null);

    try {
      const data = await analyzeVideoClient(
        videoFile,
        model,
        guidelines,
        ngWords,
        (phase) => setAnalysisPhase(phase)
      );
      setResults(data.results);
      setLastCheckTime(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
    } catch (err: any) {
      console.error(err);
      setError("解析に失敗しました。詳細: " + (err.message || "予期せぬエラー"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisPhase(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <VideoIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">動画テロップ誤字脱字チェッカー</h1>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border">
          {[
            { id: "gemini-3-flash-preview", label: "標準モード", color: "text-indigo-600", desc: "速度優先" },
            { id: "gemini-3.1-pro-preview", label: "超高精度モード", color: "text-amber-600", desc: "精度優先" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id as any)}
              className={`flex flex-col items-center px-4 py-1.5 rounded-lg transition-all ${
                model === m.id 
                  ? "bg-white shadow-sm ring-1 ring-slate-200" 
                  : "hover:bg-white/50 text-slate-500"
              }`}
            >
              <span className={`text-xs font-bold ${model === m.id ? m.color : ""}`}>{m.label}</span>
              <span className="text-[10px] opacity-60 font-medium">{m.desc}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <VideoUploader onFileSelect={setVideoFile} videoRef={videoRef} />
          
          {videoFile && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg transition-all
                ${isAnalyzing 
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"}`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {analysisPhase === "uploading" && "動画をアップロード中..."}
                  {analysisPhase === "processing" && "動画を処理中..."}
                  {analysisPhase === "analyzing" && "テロップの誤字脱字を解析中..."}
                  {(!analysisPhase || analysisPhase === "done") && "解析中..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {results ? "もう一度解析する" : "AIでチェックを実行"}
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {results && (
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {results.length > 0 ? "検出された修正候補" : "解析結果"}
                <span className={`text-xs px-2 py-0.5 rounded-full ${results.length === 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                  {results.length}
                </span>
              </h2>
              {lastCheckTime && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border">
                  Last checked: {lastCheckTime}
                </span>
              )}
            </div>
          )}

          <AnalysisResults results={results} onTimestampClick={handleTimestampClick} />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b pb-4">
              <Settings2 className="w-4 h-4" />
              解析ガイドライン
            </div>
            <GuidelineForm 
              guidelines={guidelines}
              setGuidelines={setGuidelines}
              ngWords={ngWords}
              setNgWords={setNgWords}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

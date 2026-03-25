"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Clock, ChevronRight, SlidersHorizontal } from "lucide-react";

interface AnalysisItem {
  timecode: string;
  current_text: string;
  suggested_text: string;
  reason: string;
  severity: "error" | "warning";
  confidence: number;
}

interface Props {
  results: AnalysisItem[] | null;
  onTimestampClick: (timecode: string) => void;
}

const CONFIDENCE_THRESHOLD_DEFAULT = 0.9;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let color = "bg-red-100 text-red-700 border-red-200";
  if (confidence >= 0.9) color = "bg-emerald-100 text-emerald-700 border-emerald-200";
  else if (confidence >= 0.7) color = "bg-blue-100 text-blue-700 border-blue-200";
  else if (confidence >= 0.5) color = "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      確信度 {percent}%
    </span>
  );
}

export default function AnalysisResults({ results, onTimestampClick }: Props) {
  if (!results) return null;

  const threshold = 0.9;
  const filteredResults = results.filter((item) => item.confidence >= threshold);
  const hiddenCount = results.length - filteredResults.length;

  if (results.length === 0 || filteredResults.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-[2rem] text-center space-y-4 shadow-sm">
        <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-emerald-500 transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-emerald-900 tracking-tight">
            {results.length === 0 ? "パーフェクト！誤字脱字は見つかりませんでした" : "精度の高い誤字は見つかりませんでした"}
          </h3>
          <p className="text-emerald-700/80 text-sm max-w-sm mx-auto leading-relaxed">
            {results.length === 0 
              ? "AIが動画内のテロップを全編チェックしましたが、修正が必要な箇所は検出されませんでした。素晴らしいクオリティです！"
              : `AIがいくつかの候補を検出しましたが、確信度が低いため（90%未満）表示を控えています。現在表示される明らかな誤字はありません。`}
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-100 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
            Analysis Verified
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hiddenCount > 0 && (
        <div className="flex justify-end">
          <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            AIの確信度が低い指摘（{hiddenCount}件）を非表示にしています
          </span>
        </div>
      )}

      <div className="grid gap-4">
        {filteredResults.map((item, index) => (
          <div 
            key={index}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="p-4 flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <button 
                  onClick={() => onTimestampClick(item.timecode)}
                  className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-mono text-sm flex items-center gap-2 shadow-sm hover:bg-indigo-600 transition-colors group/time"
                >
                  <Clock className="w-3.5 h-3.5 group-hover/time:scale-110 transition-transform" />
                  {item.timecode}
                </button>
                {item.severity === "error" ? (
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    誤字脱字
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    不一致
                  </span>
                )}
                <ConfidenceBadge confidence={item.confidence} />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4">
                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                  <p className="text-[10px] uppercase font-bold text-red-400 mb-1 tracking-wider">現在のテロップ</p>
                  <p className="text-sm font-medium text-slate-900">{item.current_text}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />

                <div className="p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                  <p className="text-[10px] uppercase font-bold text-green-400 mb-1 tracking-wider">修正案</p>
                  <p className="text-sm font-bold text-indigo-700">{item.suggested_text}</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-50 flex items-start gap-3">
              <p className="text-xs leading-relaxed text-slate-500">
                <span className="font-bold text-slate-700">理由:</span> {item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";

interface AnalysisItem {
  timecode: string;
  current_text: string;
  suggested_text: string;
  reason: string;
  severity: "error" | "warning";
}

interface Props {
  results: AnalysisItem[] | null;
  onTimestampClick: (timecode: string) => void;
}

export default function AnalysisResults({ results, onTimestampClick }: Props) {
  if (!results) return null;

  if (results.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-[2rem] text-center space-y-4 shadow-sm">
        <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-emerald-500 transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-emerald-900 tracking-tight">
            パーフェクト！誤字脱字は見つかりませんでした
          </h3>
          <p className="text-emerald-700/80 text-sm max-w-sm mx-auto leading-relaxed">
            AIが動画内のテロップを全編チェックしましたが、修正が必要な箇所は検出されませんでした。素晴らしいクオリティです！
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
      <div className="grid gap-4">
        {results.map((item, index) => (
          <div 
            key={index}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="p-4 flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-3 shrink-0">
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

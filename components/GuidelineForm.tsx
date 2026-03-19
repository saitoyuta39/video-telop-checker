"use client";

import { AlertCircle, Tag, Info } from "lucide-react";

interface Props {
  guidelines: string;
  setGuidelines: (val: string) => void;
  ngWords: string;
  setNgWords: (val: string) => void;
}

export default function GuidelineForm({ guidelines, setGuidelines, ngWords, setNgWords }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2 text-slate-700">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
            表記ガイドライン
          </label>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 leading-relaxed">
              AIに独自の校正ルールを指示できます。「〜です・ます調に統一」「感嘆符は半角」「特定の固有名詞の表記」など、細かなこだわりを反映可能です。
            </div>
          </div>
        </div>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          placeholder="例: 「〜です」調で統一、感嘆符は半角を使用、テロップは読みやすさを重視する等..."
          className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2 text-slate-700">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          NGワードリスト
        </label>
        <textarea
          value={ngWords}
          onChange={(e) => setNgWords(e.target.value)}
          placeholder="カンマ区切りで入力（例: 不適切表現1, 競合他社名2, ...）"
          className="w-full h-24 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      <div className="p-4 bg-slate-50 rounded-xl text-[11px] leading-relaxed text-slate-500 border border-slate-100">
        <p className="font-bold text-slate-700 mb-1">💡 ヒント</p>
        YouTube等の意図的な「崩し文字」やスラングは、特に指定がない限り自動的にエラーから除外されます。
      </div>
    </div>
  );
}

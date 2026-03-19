"use client";

import { useState, useRef } from "react";
import { Upload, X, Video } from "lucide-react";

interface Props {
  onFileSelect: (file: File | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function VideoUploader({ onFileSelect, videoRef }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        handleFile(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  };

  return (
    <div className="w-full">
      {selectedFile ? (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4 border-b pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                <Video className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight break-words">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-100 relative group">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                動画をロード中...
              </div>
            )}
          </div>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
            ${dragActive 
              ? "border-indigo-400 bg-indigo-50/50 scale-[1.01]" 
              : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 hover:scale-[1.005]"}`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="video/*"
            onChange={handleChange}
          />
          <div className="bg-white p-5 rounded-2xl shadow-sm border text-indigo-600">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              動画をアップロード
            </p>
            <p className="text-sm text-slate-500 mt-1">
              ドラッグ＆ドロップまたはクリックして選択
            </p>
          </div>
          <div className="mt-2 px-4 py-1.5 bg-slate-100 rounded-full text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Supported: MP4, MOV, WebM (up to 200MB)
          </div>
        </label>
      )}
    </div>
  );
}

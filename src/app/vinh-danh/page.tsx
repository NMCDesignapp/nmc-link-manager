'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Download, Upload, Award, Image as ImageIcon,
  User, Move, Type, RotateCcw, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Sparkles, Camera,
} from 'lucide-react';
import { toPng } from 'html-to-image';

export default function VinhDanhPage() {
  const router = useRouter();
  const posterRef = useRef<HTMLDivElement>(null);

  const [employeeName, setEmployeeName] = useState('');
  const [contentText, setContentText] = useState('hoàn thành kế hoạch tháng');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  // Position/sizes for text overlay (as % of template dimensions)
  const [nameX, setNameX] = useState(68);  // center X of name text
  const [nameY, setNameY] = useState(45.5); // center Y of name text
  const [nameFontSize, setNameFontSize] = useState(24);
  const [contentX, setContentX] = useState(68);
  const [contentY, setContentY] = useState(54);
  const [contentFontSize, setContentFontSize] = useState(14);
  const [avatarShape, setAvatarShape] = useState<'circle' | 'rect'>('circle');

  const TEMPLATE_URL = '/posters/template-thang.png';
  // Template is 925x462 pixels. Photo area: x=5-34%, y=15-54%
  // Name area: y=43-48%, x=42-95% (center ~68%)
  // Content area: below name, around y=52-56%

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!employeeName.trim()) {
      toast({ title: 'Chưa nhập tên', description: 'Vui lòng nhập tên nhân viên', variant: 'destructive' });
      return;
    }

    setIsDownloading(true);
    try {
      if (!posterRef.current) return;
      const dataUrl = await toPng(posterRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      const safeName = employeeName.trim().replace(/\s+/g, '_');
      link.download = `VinhDanh_${safeName}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Tải thành công!', description: `Đã tải poster vinh danh ${employeeName}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Lỗi tải', description: 'Không thể tạo ảnh, vui lòng thử lại', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  }, [employeeName]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-md border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-white/60 hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-1" /> Trang chủ
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              VINH DANH
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT: Controls */}
          <div className="lg:w-[360px] flex-shrink-0 space-y-4">

            {/* Avatar Upload */}
            <div className="rounded-none border border-violet-500/20 bg-[#111827]/80 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-violet-400" />
                  <Label className="text-sm font-bold text-violet-300">Hình nhân viên</Label>
                </div>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400 hover:text-red-300" onClick={() => setAvatarUrl(null)}>
                    Xóa hình
                  </Button>
                )}
              </div>

              {avatarUrl ? (
                <div className="relative group">
                  <div className="flex justify-center">
                    <div className={`w-28 h-28 overflow-hidden border-2 border-violet-500/40 ${avatarShape === 'circle' ? 'rounded-full' : 'rounded-none'}`}>
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      <div className="px-3 py-2 bg-white/20 rounded-none text-white text-xs font-medium hover:bg-white/30 transition-colors">
                        <Upload className="w-3 h-3 inline mr-1" /> Thay hình
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <div className="border-2 border-dashed border-violet-500/30 rounded-none p-6 text-center hover:border-violet-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-violet-500/50 mx-auto mb-2" />
                    <p className="text-xs text-white/40">Nhấn để upload hình nhân viên</p>
                    <p className="text-[10px] text-white/20 mt-1">JPG, PNG - Khuyến nghị hình vuông</p>
                  </div>
                </label>
              )}

              {/* Avatar shape toggle */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setAvatarShape('circle')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-none border transition-colors ${
                    avatarShape === 'circle' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  Hình tròn
                </button>
                <button
                  onClick={() => setAvatarShape('rect')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-none border transition-colors ${
                    avatarShape === 'rect' ? 'bg-violet-600 text-white border-violet-500' : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  Hình chữ nhật
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div className="rounded-none border border-amber-500/20 bg-[#111827]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-amber-400" />
                <Label className="text-sm font-bold text-amber-300">Tên nhân viên</Label>
              </div>
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="VD: NGUYỄN MINH CHÂU"
                className="h-10 text-sm border-amber-500/30 bg-white/5 text-white placeholder:text-white/30 font-semibold uppercase"
              />
            </div>

            {/* Content Input */}
            <div className="rounded-none border border-emerald-500/20 bg-[#111827]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-emerald-400" />
                <Label className="text-sm font-bold text-emerald-300">Nội dung</Label>
              </div>
              <Input
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="VD: hoàn thành kế hoạch tháng"
                className="h-10 text-sm border-emerald-500/30 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>

            {/* Position Control */}
            <div className="rounded-none border border-cyan-500/20 bg-[#111827]/80 p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowPositionControl(!showPositionControl)}
              >
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-cyan-400" />
                  <Label className="text-sm font-bold text-cyan-300">Điều chỉnh vị trí</Label>
                </div>
                {showPositionControl ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>

              {showPositionControl && (
                <div className="mt-3 space-y-3">
                  {/* Name position */}
                  <div className="text-[10px] text-amber-400/60 font-bold uppercase mb-1">Tên nhân viên</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-white/30">X</span>
                        <span className="text-[9px] text-cyan-400 font-mono">{nameX}%</span>
                      </div>
                      <input type="range" min="40" max="95" value={nameX} onChange={(e) => setNameX(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-white/30">Y</span>
                        <span className="text-[9px] text-cyan-400 font-mono">{nameY}%</span>
                      </div>
                      <input type="range" min="30" max="70" value={nameY} onChange={(e) => setNameY(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-white/30">Cỡ chữ tên</span>
                      <span className="text-[9px] text-cyan-400 font-mono">{nameFontSize}px</span>
                    </div>
                    <input type="range" min="14" max="40" value={nameFontSize} onChange={(e) => setNameFontSize(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                  </div>

                  {/* Content position */}
                  <div className="text-[10px] text-emerald-400/60 font-bold uppercase mb-1 mt-2">Nội dung</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-white/30">X</span>
                        <span className="text-[9px] text-cyan-400 font-mono">{contentX}%</span>
                      </div>
                      <input type="range" min="40" max="95" value={contentX} onChange={(e) => setContentX(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-white/30">Y</span>
                        <span className="text-[9px] text-cyan-400 font-mono">{contentY}%</span>
                      </div>
                      <input type="range" min="35" max="80" value={contentY} onChange={(e) => setContentY(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-white/30">Cỡ chữ nội dung</span>
                      <span className="text-[9px] text-cyan-400 font-mono">{contentFontSize}px</span>
                    </div>
                    <input type="range" min="8" max="28" value={contentFontSize} onChange={(e) => setContentFontSize(parseInt(e.target.value))} className="w-full h-1 accent-cyan-500" />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-white/40 hover:text-white border border-white/10 mt-1"
                    onClick={() => {
                      setNameX(68); setNameY(45.5); setNameFontSize(24);
                      setContentX(68); setContentY(54); setContentFontSize(14);
                    }}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset mặc định
                  </Button>
                </div>
              )}
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              disabled={isDownloading || !employeeName.trim()}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
            >
              {isDownloading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang tạo ảnh...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Tải poster vinh danh</>
              )}
            </Button>

            {!employeeName.trim() && (
              <div className="text-center py-2 px-3 rounded-none bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400/70">Nhập tên nhân viên để tải poster</p>
              </div>
            )}
          </div>

          {/* RIGHT: Poster Preview */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[700px]">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40 font-medium">Xem trước poster</span>
                {employeeName.trim() && (
                  <span className="text-[10px] text-emerald-400/60">Sẵn sàng tải</span>
                )}
              </div>

              {/* Poster Preview Container */}
              <div
                className="relative bg-[#1a1a2e] rounded-none border border-white/10 overflow-hidden"
                style={{ aspectRatio: '925/462' }}
              >
                <div ref={posterRef} className="relative w-full h-full">
                  {/* Background Template Image */}
                  <img
                    src={TEMPLATE_URL}
                    alt="Template"
                    className="absolute inset-0 w-full h-full object-fill"
                    crossOrigin="anonymous"
                  />

                  {/* Avatar Overlay - Photo area: x=5-34%, y=15-54% */}
                  {avatarUrl && (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        left: '5.5%',
                        top: '16%',
                        width: '27.5%',
                        height: '37%',
                      }}
                    >
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className={`w-full h-full object-cover ${avatarShape === 'circle' ? 'rounded-full' : 'rounded-none'}`}
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Name Text Overlay - y=43-48%, center x≈68% */}
                  {employeeName.trim() && (
                    <div
                      className="absolute text-center"
                      style={{
                        left: `${nameX}%`,
                        top: `${nameY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '55%',
                      }}
                    >
                      <p
                        className="font-extrabold uppercase leading-tight tracking-wider"
                        style={{
                          fontSize: `${nameFontSize}px`,
                          color: '#ffffff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.5)',
                        }}
                      >
                        {employeeName.trim().toUpperCase()}
                      </p>
                    </div>
                  )}

                  {/* Content Text Overlay */}
                  {contentText.trim() && employeeName.trim() && (
                    <div
                      className="absolute text-center"
                      style={{
                        left: `${contentX}%`,
                        top: `${contentY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '55%',
                      }}
                    >
                      <p
                        className="font-medium leading-tight"
                        style={{
                          fontSize: `${contentFontSize}px`,
                          color: '#e0e0e0',
                          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                        }}
                      >
                        {contentText.trim()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick tips */}
              <div className="mt-4 rounded-none border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline text-amber-500/40 mr-1" />
                  <b className="text-white/40">Hướng dẫn:</b> Upload hình nhân viên → Nhập tên → Nhập nội dung (VD: &quot;hoàn thành kế hoạch tháng&quot;) → Bấm tải poster. Điều chỉnh vị trí chữ nếu cần trong phần &quot;Điều chỉnh vị trí&quot;.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

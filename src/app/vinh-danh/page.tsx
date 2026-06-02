'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Download, Upload, Trophy, Star, Crown,
  Image as ImageIcon, Sparkles, User, Calendar, RotateCcw,
  Move, Type, ZoomIn, ZoomOut, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Award, Medal,
} from 'lucide-react';
import { toPng } from 'html-to-image';

type PeriodType = 'thang' | 'quy' | '6thang' | 'nam';

interface TemplateConfig {
  period: PeriodType;
  label: string;
  subLabel: string;
  imageUrl: string | null;
  // Text position as percentage of image dimensions
  textX: number; // % from left
  textY: number; // % from top
  fontSize: number; // px
  nameFontSize: number; // px
  periodFontSize: number; // px
}

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  { period: 'thang', label: 'THÁNG', subLabel: 'hoàn thành kế hoạch tháng', imageUrl: null, textX: 50, textY: 72, fontSize: 22, nameFontSize: 28, periodFontSize: 18 },
  { period: 'quy', label: 'QUÝ', subLabel: 'hoàn thành kế hoạch quý', imageUrl: null, textX: 50, textY: 72, fontSize: 22, nameFontSize: 28, periodFontSize: 18 },
  { period: '6thang', label: '6 THÁNG', subLabel: 'hoàn thành kế hoạch 6 tháng', imageUrl: null, textX: 50, textY: 72, fontSize: 22, nameFontSize: 28, periodFontSize: 18 },
  { period: 'nam', label: 'NĂM', subLabel: 'hoàn thành kế hoạch năm', imageUrl: null, textX: 50, textY: 72, fontSize: 22, nameFontSize: 28, periodFontSize: 18 },
];

const PERIOD_COLORS: Record<PeriodType, { bg: string; border: string; text: string; glow: string; activeBg: string }> = {
  thang: { bg: 'bg-emerald-600/20', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: '#10b981', activeBg: 'bg-emerald-600' },
  quy: { bg: 'bg-amber-600/20', border: 'border-amber-500/40', text: 'text-amber-400', glow: '#f59e0b', activeBg: 'bg-amber-600' },
  '6thang': { bg: 'bg-violet-600/20', border: 'border-violet-500/40', text: 'text-violet-400', glow: '#8b5cf6', activeBg: 'bg-violet-600' },
  nam: { bg: 'bg-rose-600/20', border: 'border-rose-500/40', text: 'text-rose-400', glow: '#f43f5e', activeBg: 'bg-rose-600' },
};

export default function VinhDanhPage() {
  const router = useRouter();
  const posterRef = useRef<HTMLDivElement>(null);

  const [employeeName, setEmployeeName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('quy');
  const [templates, setTemplates] = useState<TemplateConfig[]>(DEFAULT_TEMPLATES);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  const currentTemplate = templates.find(t => t.period === selectedPeriod)!;
  const periodColor = PERIOD_COLORS[selectedPeriod];

  const handleImageUpload = useCallback((period: PeriodType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setTemplates(prev => prev.map(t => t.period === period ? { ...t, imageUrl: url } : t));
    };
    reader.readAsDataURL(file);
  }, []);

  const updateTemplate = useCallback((period: PeriodType, updates: Partial<TemplateConfig>) => {
    setTemplates(prev => prev.map(t => t.period === period ? { ...t, ...updates } : t));
  }, []);

  const handleDownload = useCallback(async () => {
    if (!currentTemplate.imageUrl) {
      toast({ title: 'Chưa có mẫu', description: 'Vui lòng upload ảnh mẫu trước', variant: 'destructive' });
      return;
    }
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
      const periodLabel = currentTemplate.label;
      const safeName = employeeName.trim().replace(/\s+/g, '_');
      link.download = `VinhDanh_${safeName}_${periodLabel}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Tải thành công!', description: `Đã tải poster vinh danh ${employeeName}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Lỗi tải', description: 'Không thể tạo ảnh, vui lòng thử lại', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  }, [currentTemplate, employeeName]);

  const periodLabel = currentTemplate.subLabel;

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
          <div className="lg:w-[380px] flex-shrink-0 space-y-5">

            {/* Name Input */}
            <div className="rounded-none border border-emerald-500/20 bg-[#111827]/80 p-4">
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

            {/* Period Selection */}
            <div className="rounded-none border border-emerald-500/20 bg-[#111827]/80 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <Label className="text-sm font-bold text-emerald-300">Kỳ hoàn thành</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_TEMPLATES.map(t => {
                  const pc = PERIOD_COLORS[t.period];
                  const isActive = selectedPeriod === t.period;
                  return (
                    <button
                      key={t.period}
                      onClick={() => setSelectedPeriod(t.period)}
                      className={`relative py-3 px-3 rounded-none font-bold text-xs transition-all duration-200 border ${
                        isActive
                          ? `${pc.activeBg} text-white border-transparent shadow-lg`
                          : `${pc.bg} ${pc.text} ${pc.border} hover:brightness-125`
                      }`}
                      style={isActive ? { boxShadow: `0 4px 20px ${pc.glow}40` } : {}}
                    >
                      {isActive && <Sparkles className="w-3 h-3 absolute top-1 right-1 opacity-60" />}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Upload */}
            <div className="rounded-none border border-emerald-500/20 bg-[#111827]/80 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <Label className="text-sm font-bold text-violet-300">Mẫu poster - {currentTemplate.label}</Label>
                </div>
                {currentTemplate.imageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-red-400 hover:text-red-300"
                    onClick={() => updateTemplate(selectedPeriod, { imageUrl: null })}
                  >
                    Xóa mẫu
                  </Button>
                )}
              </div>

              {currentTemplate.imageUrl ? (
                <div className="relative group">
                  <img
                    src={currentTemplate.imageUrl}
                    alt={`Mẫu ${currentTemplate.label}`}
                    className="w-full rounded-none border border-white/10"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload(selectedPeriod)}
                        className="hidden"
                      />
                      <div className="px-3 py-2 bg-white/20 rounded-none text-white text-xs font-medium hover:bg-white/30 transition-colors">
                        <Upload className="w-3 h-3 inline mr-1" /> Thay mẫu
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload(selectedPeriod)}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-violet-500/30 rounded-none p-8 text-center hover:border-violet-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-violet-500/50 mx-auto mb-2" />
                    <p className="text-xs text-white/40">Nhấn để upload ảnh mẫu</p>
                    <p className="text-[10px] text-white/20 mt-1">PNG, JPG - Khuyến nghị 9:16</p>
                  </div>
                </label>
              )}
            </div>

            {/* Text Position Control */}
            <div className="rounded-none border border-emerald-500/20 bg-[#111827]/80 p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowPositionControl(!showPositionControl)}
              >
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-cyan-400" />
                  <Label className="text-sm font-bold text-cyan-300">Vị trí chữ</Label>
                </div>
                {showPositionControl ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>

              {showPositionControl && (
                <div className="mt-3 space-y-3">
                  {/* X Position */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Vị trí ngang (X)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{currentTemplate.textX}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/40 hover:text-white" onClick={() => updateTemplate(selectedPeriod, { textX: Math.max(5, currentTemplate.textX - 2) })}>
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={currentTemplate.textX}
                        onChange={(e) => updateTemplate(selectedPeriod, { textX: parseInt(e.target.value) })}
                        className="flex-1 h-1 accent-cyan-500"
                      />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/40 hover:text-white" onClick={() => updateTemplate(selectedPeriod, { textX: Math.min(95, currentTemplate.textX + 2) })}>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Y Position */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Vị trí dọc (Y)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{currentTemplate.textY}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/40 hover:text-white" onClick={() => updateTemplate(selectedPeriod, { textY: Math.max(10, currentTemplate.textY - 2) })}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <input
                        type="range"
                        min="10"
                        max="95"
                        value={currentTemplate.textY}
                        onChange={(e) => updateTemplate(selectedPeriod, { textY: parseInt(e.target.value) })}
                        className="flex-1 h-1 accent-cyan-500"
                      />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/40 hover:text-white" onClick={() => updateTemplate(selectedPeriod, { textY: Math.min(95, currentTemplate.textY + 2) })}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Font sizes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Cỡ chữ "CHÚC MỪNG"</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{currentTemplate.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={currentTemplate.fontSize}
                      onChange={(e) => updateTemplate(selectedPeriod, { fontSize: parseInt(e.target.value) })}
                      className="w-full h-1 accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Cỡ chữ tên</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{currentTemplate.nameFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="56"
                      value={currentTemplate.nameFontSize}
                      onChange={(e) => updateTemplate(selectedPeriod, { nameFontSize: parseInt(e.target.value) })}
                      className="w-full h-1 accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">Cỡ chữ kỳ</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{currentTemplate.periodFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="36"
                      value={currentTemplate.periodFontSize}
                      onChange={(e) => updateTemplate(selectedPeriod, { periodFontSize: parseInt(e.target.value) })}
                      className="w-full h-1 accent-cyan-500"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-white/40 hover:text-white border border-white/10"
                    onClick={() => updateTemplate(selectedPeriod, { textX: 50, textY: 72, fontSize: 22, nameFontSize: 28, periodFontSize: 18 })}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset vị trí mặc định
                  </Button>
                </div>
              )}
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              disabled={isDownloading || !currentTemplate.imageUrl || !employeeName.trim()}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
            >
              {isDownloading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang tạo ảnh...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Tải poster vinh danh</>
              )}
            </Button>

            {/* Status info */}
            {!currentTemplate.imageUrl && (
              <div className="text-center py-2 px-3 rounded-none bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400/70">Upload ảnh mẫu cho kỳ {currentTemplate.label} để bắt đầu</p>
              </div>
            )}
            {currentTemplate.imageUrl && !employeeName.trim() && (
              <div className="text-center py-2 px-3 rounded-none bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400/70">Nhập tên nhân viên để xem trước poster</p>
              </div>
            )}
          </div>

          {/* RIGHT: Poster Preview */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[600px]">
              {/* Preview Label */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/40 font-medium">Xem trước poster</span>
                </div>
                {currentTemplate.imageUrl && employeeName.trim() && (
                  <span className="text-[10px] text-emerald-400/60">Sẵn sàng tải</span>
                )}
              </div>

              {/* Poster Container */}
              <div
                className="relative bg-[#1a1a2e] rounded-none border border-white/10 overflow-hidden"
                style={{ aspectRatio: '923/465' }}
              >
                {currentTemplate.imageUrl ? (
                  <div ref={posterRef} className="relative w-full h-full">
                    {/* Background Image */}
                    <img
                      src={currentTemplate.imageUrl}
                      alt="Poster template"
                      className="absolute inset-0 w-full h-full object-fill"
                    />

                    {/* Text Overlay */}
                    {employeeName.trim() && (
                      <div
                        className="absolute flex flex-col items-center text-center"
                        style={{
                          left: `${currentTemplate.textX}%`,
                          top: `${currentTemplate.textY}%`,
                          transform: 'translate(-50%, -50%)',
                          width: '80%',
                        }}
                      >
                        <p
                          className="font-bold text-white leading-tight tracking-wide"
                          style={{
                            fontSize: `${currentTemplate.fontSize}px`,
                            textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.3)',
                          }}
                        >
                          CHÚC MỪNG
                        </p>
                        <p
                          className="font-extrabold leading-tight tracking-wider mt-1"
                          style={{
                            fontSize: `${currentTemplate.nameFontSize}px`,
                            background: 'linear-gradient(180deg, #FFD700, #FFA500)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 6px rgba(255,215,0,0.4))',
                          }}
                        >
                          AD {employeeName.trim().toUpperCase()}
                        </p>
                        <p
                          className="font-semibold text-white/90 leading-tight mt-1"
                          style={{
                            fontSize: `${currentTemplate.periodFontSize}px`,
                            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          {periodLabel}
                        </p>
                      </div>
                    )}

                    {/* Empty name hint */}
                    {!employeeName.trim() && (
                      <div
                        className="absolute flex flex-col items-center text-center"
                        style={{
                          left: `${currentTemplate.textX}%`,
                          top: `${currentTemplate.textY}%`,
                          transform: 'translate(-50%, -50%)',
                          width: '80%',
                        }}
                      >
                        <p className="text-sm text-white/20 italic">Nhập tên để xem trước</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Crown className="w-8 h-8 text-amber-500/30" />
                    </div>
                    <p className="text-sm text-white/20">Chưa có ảnh mẫu</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload(selectedPeriod)}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-violet-600/20 border border-violet-500/30 rounded-none text-violet-400 text-xs font-medium hover:bg-violet-600/30 transition-colors">
                        <Upload className="w-3 h-3 inline mr-1" /> Upload mẫu
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Quick preview of all templates */}
              <div className="mt-5">
                <p className="text-[10px] text-white/30 mb-2 font-medium">Tất cả mẫu đã upload</p>
                <div className="grid grid-cols-4 gap-2">
                  {templates.map(t => {
                    const pc = PERIOD_COLORS[t.period];
                    const isActive = selectedPeriod === t.period;
                    return (
                      <button
                        key={t.period}
                        onClick={() => setSelectedPeriod(t.period)}
                        className={`relative aspect-[923/465] rounded-none border overflow-hidden transition-all ${
                          isActive ? `border-2 ${pc.border} ring-1 ring-white/20` : 'border-white/10 opacity-50 hover:opacity-80'
                        }`}
                      >
                        {t.imageUrl ? (
                          <img src={t.imageUrl} alt={t.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full ${pc.bg} flex items-center justify-center`}>
                            <span className={`text-[8px] ${pc.text} font-bold`}>{t.label}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center">
                          <span className="text-[8px] text-white/60 font-medium">{t.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

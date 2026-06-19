'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Download, Award, Image as ImageIcon,
  Move, Type, RotateCcw,
  Sparkles, Layout, Minus, Plus,
  Building2,
} from 'lucide-react';
import { toPng } from 'html-to-image';

// ===== FONT OPTIONS =====
const FONT_OPTIONS = [
  { id: 'serif', name: 'Serif', value: '"Noto Serif Display", "Playfair Display", Georgia, serif' },
  { id: 'sans', name: 'Sans Serif', value: '"Montserrat", "Noto Sans", sans-serif' },
  { id: 'dm-serif', name: 'DM Serif', value: '"DM Serif Display", serif' },
  { id: 'script', name: 'Script', value: '"Great Vibes", "Dancing Script", cursive' },
  { id: 'dancing', name: 'Dancing', value: '"Dancing Script", cursive' },
  { id: 'alex', name: 'Alex Brush', value: '"Alex Brush", "Sacramento", cursive' },
  { id: 'anton', name: 'Anton', value: '"Anton", "Noto Sans", sans-serif' },
  { id: 'paytone', name: 'Paytone', value: '"Paytone One", "Noto Sans", sans-serif' },
  { id: 'lora', name: 'Lora', value: '"Lora", serif' },
];

// ===== TEMPLATE CONFIGURATION =====
export interface TextField {
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  left: number;         // % center X position
  top: number;          // % center Y position
  fontSize: number;     // base px font size (will scale with poster)
  width: number;        // % width of text container
  color: string;
  fontWeight: string;
  fontFamily: string;
  textTransform: string;
  textShadow: string;
  letterSpacing: string;
  textAlign?: string;
  lineHeight?: string;
}

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  group: 'phong' | 'ad';
  backgroundImage: string;
  aspectRatio: string;
  textFields: TextField[];
}

// ===== ALL TEMPLATES =====
const TEMPLATES: PosterTemplate[] = [
  // ===== PHÒNG (6 mẫu: 3 từ file 1 + 3 từ file 2) =====
  {
    id: 'phong-1',
    name: 'Phòng 1',
    description: 'Vinh danh Phòng - Mẫu 1',
    group: 'phong',
    backgroundImage: '/posters/template-phong-1.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng đạt chỉ tiêu tháng',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#e2cc87', fontWeight: '400',
        fontFamily: '"Montserrat", "Noto Sans", sans-serif',
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  {
    id: 'phong-2',
    name: 'Phòng 2',
    description: 'Vinh danh Phòng - Mẫu 2',
    group: 'phong',
    backgroundImage: '/posters/template-phong-2.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng đạt chỉ tiêu quý',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#e2cc87', fontWeight: '400',
        fontFamily: '"Montserrat", "Noto Sans", sans-serif',
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  {
    id: 'phong-3',
    name: 'Phòng 3',
    description: 'Vinh danh Phòng - Mẫu 3',
    group: 'phong',
    backgroundImage: '/posters/template-phong-3.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng xuất sắc',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#e2cc87', fontWeight: '400',
        fontFamily: '"Montserrat", "Noto Sans", sans-serif',
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  {
    id: 'phong-4',
    name: 'Phòng 4',
    description: 'Vinh danh Phòng - Mẫu 4',
    group: 'phong',
    backgroundImage: '/posters/template-phong-4.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng đạt thành tích',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#ffffff', fontWeight: '400',
        fontFamily: '"Lora", serif',
        textTransform: 'none',
        textShadow: '0 2px 10px rgba(0,0,0,0.9)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  {
    id: 'phong-5',
    name: 'Phòng 5',
    description: 'Vinh danh Phòng - Mẫu 5',
    group: 'phong',
    backgroundImage: '/posters/template-phong-5.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng dẫn đầu',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#ffffff', fontWeight: '400',
        fontFamily: '"Lora", serif',
        textTransform: 'none',
        textShadow: '0 2px 10px rgba(0,0,0,0.9)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  {
    id: 'phong-6',
    name: 'Phòng 6',
    description: 'Vinh danh Phòng - Mẫu 6',
    group: 'phong',
    backgroundImage: '/posters/template-phong-6.png',
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung chúc mừng',
        placeholder: 'VD: Chúc mừng phòng vượt chỉ tiêu',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#ffffff', fontWeight: '400',
        fontFamily: '"Lora", serif',
        textTransform: 'none',
        textShadow: '0 2px 10px rgba(0,0,0,0.9)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  },
  // ===== AD (17 mẫu: 5 từ file 1 + 6 từ file 2 + 6 từ file 3) =====
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `ad-${i + 1}`,
    name: `AD ${i + 1}`,
    description: `Vinh danh AD - Mẫu ${i + 1}`,
    group: 'ad' as const,
    backgroundImage: `/posters/template-AD-${i + 1}.png`,
    aspectRatio: '2/1',
    textFields: [
      {
        id: 'content', label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc chỉ tiêu tháng',
        defaultValue: '',
        left: 50, top: 65, fontSize: 14, width: 50,
        color: '#e2cc87', fontWeight: '400',
        fontFamily: '"Montserrat", "Noto Sans", sans-serif',
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
        textAlign: 'center', lineHeight: '1.5',
      },
    ],
  })),
];

// ===== TEMPLATE GROUP DEFINITIONS =====
const TEMPLATE_GROUPS = [
  { id: 'phong' as const, name: 'PHÒNG', icon: Building2, color: 'blue' },
  { id: 'ad' as const, name: 'AD', icon: Award, color: 'purple' },
];

export default function VinhDanhPage() {
  const router = useRouter();
  const posterRef = useRef<HTMLDivElement>(null);
  const posterContainerRef = useRef<HTMLDivElement>(null);

  const [activeGroup, setActiveGroup] = useState<'phong' | 'ad'>('phong');
  const [activeTemplateId, setActiveTemplateId] = useState(TEMPLATES[0].id);
  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId) || TEMPLATES[0];
  const filteredTemplates = TEMPLATES.filter(t => t.group === activeGroup);

  // Text field values keyed by templateId-fieldId
  const [textValues, setTextValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    TEMPLATES.forEach(t => {
      t.textFields.forEach(f => {
        vals[`${t.id}-${f.id}`] = f.defaultValue;
      });
    });
    return vals;
  });

  // Font override keyed by templateId-fieldId
  const [fontOverrides, setFontOverrides] = useState<Record<string, string>>({});

  const [isDownloading, setIsDownloading] = useState(false);

  // Position overrides per field keyed by templateId-fieldId
  const [positionOverrides, setPositionOverrides] = useState<Record<string, {
    left: number; top: number; fontSize: number;
  }>>({});

  // Dragging state for text fields
  const [draggingText, setDraggingText] = useState<string | null>(null);
  const [textDragStart, setTextDragStart] = useState<{
    clientX: number; clientY: number; left: number; top: number;
  } | null>(null);

  // Selected text field
  const [selectedTextField, setSelectedTextField] = useState<string | null>(null);

  const contentField = activeTemplate.textFields.find(f => f.id === 'content');
  const contentValue = contentField ? (textValues[`${activeTemplateId}-${contentField.id}`] ?? contentField.defaultValue) : '';

  const getTextValue = (field: TextField) =>
    textValues[`${activeTemplateId}-${field.id}`] ?? field.defaultValue;

  const setTextValue = (field: TextField, value: string) => {
    setTextValues(prev => ({ ...prev, [`${activeTemplateId}-${field.id}`]: value }));
  };

  const getFont = (field: TextField) => {
    const key = `${activeTemplateId}-${field.id}`;
    return fontOverrides[key] ?? field.fontFamily;
  };

  const setFont = (field: TextField, fontValue: string) => {
    const key = `${activeTemplateId}-${field.id}`;
    setFontOverrides(prev => ({ ...prev, [key]: fontValue }));
  };

  const getPos = (field: TextField) => {
    const key = `${activeTemplateId}-${field.id}`;
    const ovr = positionOverrides[key];
    return {
      left: ovr?.left ?? field.left,
      top: ovr?.top ?? field.top,
      fontSize: ovr?.fontSize ?? field.fontSize,
    };
  };

  const setPos = (field: TextField, prop: 'left' | 'top' | 'fontSize', value: number) => {
    const key = `${activeTemplateId}-${field.id}`;
    setPositionOverrides(prev => ({
      ...prev,
      [key]: { ...prev[key], ...{ [prop]: value } },
    }));
  };

  // ===== DRAG HANDLER FOR TEXT ON POSTER =====
  const handleTextMouseDown = useCallback((fieldId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const field = activeTemplate.textFields.find(f => f.id === fieldId);
    if (!field) return;
    const pos = getPos(field);
    setDraggingText(fieldId);
    setSelectedTextField(fieldId);
    setTextDragStart({ clientX: e.clientX, clientY: e.clientY, left: pos.left, top: pos.top });
  }, [activeTemplateId]);

  // Touch drag handler
  const handleTextTouchStart = useCallback((fieldId: string, e: React.TouchEvent) => {
    e.stopPropagation();
    const field = activeTemplate.textFields.find(f => f.id === fieldId);
    if (!field) return;
    const pos = getPos(field);
    const touch = e.touches[0];
    setDraggingText(fieldId);
    setSelectedTextField(fieldId);
    setTextDragStart({ clientX: touch.clientX, clientY: touch.clientY, left: pos.left, top: pos.top });
  }, [activeTemplateId]);

  // Global mouse move/up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingText && textDragStart && posterRef.current) {
        const rect = posterRef.current.getBoundingClientRect();
        const dx = ((e.clientX - textDragStart.clientX) / rect.width) * 100;
        const dy = ((e.clientY - textDragStart.clientY) / rect.height) * 100;
        const key = `${activeTemplateId}-${draggingText}`;
        setPositionOverrides(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            left: Math.max(5, Math.min(95, textDragStart.left + dx)),
            top: Math.max(5, Math.min(95, textDragStart.top + dy)),
            fontSize: prev[key]?.fontSize ?? activeTemplate.textFields.find(f => f.id === draggingText)?.fontSize ?? 14,
          },
        }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (draggingText && textDragStart && posterRef.current) {
        const touch = e.touches[0];
        const rect = posterRef.current.getBoundingClientRect();
        const dx = ((touch.clientX - textDragStart.clientX) / rect.width) * 100;
        const dy = ((touch.clientY - textDragStart.clientY) / rect.height) * 100;
        const key = `${activeTemplateId}-${draggingText}`;
        setPositionOverrides(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            left: Math.max(5, Math.min(95, textDragStart.left + dx)),
            top: Math.max(5, Math.min(95, textDragStart.top + dy)),
            fontSize: prev[key]?.fontSize ?? activeTemplate.textFields.find(f => f.id === draggingText)?.fontSize ?? 14,
          },
        }));
      }
    };

    const handleEnd = () => {
      setDraggingText(null);
      setTextDragStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [draggingText, textDragStart, activeTemplateId]);

  // ===== DOWNLOAD =====
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      if (!posterRef.current) return;
      // Deselect text field to hide selection ring
      setSelectedTextField(null);
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(posterRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      const safeName = activeTemplate.id.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `VinhDanh_${safeName}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Tải thành công!', description: 'Đã tải poster vinh danh' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Lỗi tải', description: 'Không thể tạo ảnh, vui lòng thử lại', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  }, [activeTemplate]);

  const resetPositions = () => {
    const newOvr: Record<string, { left: number; top: number; fontSize: number }> = {};
    activeTemplate.textFields.forEach(f => {
      const key = `${activeTemplateId}-${f.id}`;
      newOvr[key] = { left: f.left, top: f.top, fontSize: f.fontSize };
    });
    setPositionOverrides(prev => ({ ...prev, ...newOvr }));
    // Reset font overrides for current template
    const newFonts = { ...fontOverrides };
    activeTemplate.textFields.forEach(f => {
      const key = `${activeTemplateId}-${f.id}`;
      delete newFonts[key];
    });
    setFontOverrides(newFonts);
  };

  // Get group color scheme
  const getGroupColor = () => {
    if (activeGroup === 'phong') return 'cyan';
    return 'purple';
  };

  const accentColor = getGroupColor();

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Noto+Serif+Display:wght@400;600;700&family=Playfair+Display:wght@400;700;800&family=Alex+Brush&family=Dancing+Script:wght@400;700&family=Montserrat:wght@300;400;500;600;700&family=DM+Serif+Display&family=Anton&family=Paytone+One&family=Lora:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0d0d1a] to-[#0a0a12] text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur-md border-b border-cyan-500/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton href="/" size={36} title="Trở về trang chủ" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
                  VINH DANH
                </h1>
                <p className="text-[9px] text-cyan-500/40 tracking-widest uppercase">Tạo poster chúc mừng</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Template Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-cyan-400/70" />
              <span className="text-sm font-semibold text-cyan-300/80 tracking-wide">Chọn mẫu poster</span>
            </div>

            {/* Group Tabs */}
            <div className="flex gap-2 mb-3">
              {TEMPLATE_GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = activeGroup === group.id;
                const colorClasses = {
                  blue: {
                    active: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/25',
                    inactive: 'bg-white/5 text-white/40 border-white/10 hover:bg-cyan-500/10 hover:text-white/60 hover:border-cyan-500/20',
                    iconBg: isActive ? 'bg-white/25' : 'bg-cyan-500/10',
                  },
                  purple: {
                    active: 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-500 shadow-lg shadow-purple-500/25',
                    inactive: 'bg-white/5 text-white/40 border-white/10 hover:bg-purple-500/10 hover:text-white/60 hover:border-purple-500/20',
                    iconBg: isActive ? 'bg-white/25' : 'bg-purple-500/10',
                  },
                }[group.color];
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setActiveGroup(group.id);
                      const firstInGroup = TEMPLATES.find(t => t.group === group.id);
                      if (firstInGroup) setActiveTemplateId(firstInGroup.id);
                      setSelectedTextField(null);
                    }}
                    className={`px-4 py-2.5 text-sm font-bold rounded-lg border transition-all duration-200 ${
                      isActive ? colorClasses.active : colorClasses.inactive
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${colorClasses.iconBg}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span>{group.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Templates within selected group - scrollable */}
            <div className="flex gap-2 flex-wrap max-h-[120px] overflow-y-auto pr-1">
              {filteredTemplates.map((template, idx) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setActiveTemplateId(template.id);
                    setSelectedTextField(null);
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all duration-200 ${
                    activeTemplateId === template.id
                      ? activeGroup === 'phong'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/25'
                        : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                      activeTemplateId === template.id ? 'bg-white/25' : 'bg-white/10'
                    }`}>
                      {idx + 1}
                    </div>
                    <span>{template.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-cyan-500/30 mt-2 tracking-wide">{activeTemplate.description}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT: Controls Panel */}
            <div className="lg:w-[380px] flex-shrink-0 space-y-3">

              {/* Content Text Field */}
              {activeTemplate.textFields.map((field) => (
                <div key={field.id} className="rounded-xl border border-cyan-500/15 bg-[#0f0f1a]/90 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-cyan-400/70" />
                      <Label className="text-sm font-semibold text-cyan-300/80">{field.label}</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const pos = getPos(field);
                          setPos(field, 'fontSize', Math.max(6, pos.fontSize - 1));
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-cyan-400/50 font-mono w-8 text-center">{getPos(field).fontSize}px</span>
                      <button
                        onClick={() => {
                          const pos = getPos(field);
                          setPos(field, 'fontSize', Math.min(80, pos.fontSize + 1));
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <Input
                    value={getTextValue(field)}
                    onChange={(e) => setTextValue(field, e.target.value)}
                    onFocus={() => setSelectedTextField(field.id)}
                    placeholder={field.placeholder}
                    className="h-10 text-sm bg-white/5 text-white placeholder:text-white/20 border-cyan-500/20 focus:border-cyan-500/40"
                    style={{ fontFamily: getFont(field) }}
                  />

                  {/* Font Selector */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] text-white/25 uppercase tracking-wider">Font chữ</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {FONT_OPTIONS.map((font) => {
                        const currentFont = getFont(field);
                        const isActive = currentFont === font.value;
                        return (
                          <button
                            key={font.id}
                            onClick={() => setFont(field, font.value)}
                            className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${
                              isActive
                                ? activeGroup === 'phong'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10 hover:text-white/50'
                            }`}
                            style={{ fontFamily: font.value }}
                          >
                            {font.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Position Controls */}
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] text-white/20">X</span>
                          <span className="text-[8px] text-cyan-400/40 font-mono">{getPos(field).left}%</span>
                        </div>
                        <input type="range" min="5" max="95" value={getPos(field).left}
                          onChange={(e) => setPos(field, 'left', parseInt(e.target.value))}
                          className="w-full h-1 accent-cyan-500" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] text-white/20">Y</span>
                          <span className="text-[8px] text-cyan-400/40 font-mono">{getPos(field).top}%</span>
                        </div>
                        <input type="range" min="5" max="95" value={getPos(field).top}
                          onChange={(e) => setPos(field, 'top', parseInt(e.target.value))}
                          className="w-full h-1 accent-cyan-500" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] text-white/20">Cỡ</span>
                          <span className="text-[8px] text-cyan-400/40 font-mono">{getPos(field).fontSize}px</span>
                        </div>
                        <input type="range" min="6" max="80" value={getPos(field).fontSize}
                          onChange={(e) => setPos(field, 'fontSize', parseInt(e.target.value))}
                          className="w-full h-1 accent-cyan-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-[10px] text-white/30 hover:text-white/50 border border-white/5"
                onClick={resetPositions}
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset mặc định
              </Button>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg rounded-xl"
                style={{ boxShadow: '0 4px 25px rgba(6,182,212,0.3)' }}
              >
                {isDownloading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang tạo ảnh...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Tải poster vinh danh</>
                )}
              </Button>

              {/* Tips */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="text-[10px] text-white/20 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline text-cyan-500/30 mr-1" />
                  <b className="text-white/30">Hướng dẫn:</b> Chọn mẫu &rarr; Nhập nội dung &rarr; Chọn font, chỉnh kích thước và vị trí &rarr; Kéo chữ trên poster để di chuyển &rarr; Bấm tải.
                </p>
              </div>
            </div>

            {/* RIGHT: Poster Preview */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full max-w-[750px]">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-cyan-500/30" />
                  <span className="text-xs text-white/30 font-medium">Xem trước - {activeTemplate.name}</span>
                </div>

                <div
                  className="relative w-full border-2 border-cyan-500/15 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/5"
                  style={{ aspectRatio: activeTemplate.aspectRatio }}
                >
                  <div ref={posterRef} className="relative w-full h-full select-none">
                    {/* Background Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeTemplate.backgroundImage}
                      alt={activeTemplate.name}
                      className="absolute inset-0 w-full h-full object-fill"
                      draggable={false}
                    />

                    {/* Text Fields Overlay */}
                    {activeTemplate.textFields.map((field) => {
                      const pos = getPos(field);
                      const value = getTextValue(field);
                      const fontFam = getFont(field);
                      const isSelected = selectedTextField === field.id;

                      return (
                        <div
                          key={field.id}
                          className="absolute"
                          style={{
                            left: `${pos.left}%`,
                            top: `${pos.top}%`,
                            transform: 'translate(-50%, -50%)',
                            width: `${field.width}%`,
                            zIndex: 10,
                          }}
                          onMouseDown={(e) => handleTextMouseDown(field.id, e)}
                          onTouchStart={(e) => handleTextTouchStart(field.id, e)}
                        >
                          {value ? (
                            <div
                              className={`cursor-move text-center transition-all ${isSelected ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-transparent rounded' : ''}`}
                              style={{
                                color: field.color,
                                fontWeight: field.fontWeight as React.CSSProperties['fontWeight'],
                                fontFamily: fontFam,
                                textTransform: field.textTransform as React.CSSProperties['textTransform'],
                                textShadow: field.textShadow,
                                letterSpacing: field.letterSpacing,
                                textAlign: field.textAlign as React.CSSProperties['textAlign'],
                                lineHeight: field.lineHeight,
                                fontSize: `${pos.fontSize}px`,
                              }}
                            >
                              {value}
                            </div>
                          ) : (
                            <div
                              className={`cursor-move text-center border-2 border-dashed rounded-lg p-2 transition-all ${isSelected ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-white/10 hover:border-white/20'}`}
                              style={{
                                color: 'rgba(255,255,255,0.15)',
                                fontFamily: fontFam,
                                fontSize: `${Math.min(pos.fontSize, 14)}px`,
                              }}
                            >
                              {field.placeholder}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[9px] text-white/15 mt-2 text-center">Kéo chữ trên poster để di chuyển vị trí</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  Sparkles, Camera, Layout, Plus,
} from 'lucide-react';
import { toPng } from 'html-to-image';

// ===== TEMPLATE CONFIGURATION =====
// Each template has its own background, image slots, and text field positions
// To add a new template, just add an entry to this array

export interface ImageSlot {
  id: string;
  label: string;        // Display label for the upload field
  left: number;         // % position from left
  top: number;          // % position from top
  width: number;        // % width
  height: number;       // % height
  shape: 'circle' | 'rect' | 'rounded'; // Shape of the image
  objectFit: 'cover' | 'contain';
  draggable?: boolean;  // Allow drag to reposition within frame
}

export interface TextField {
  id: string;
  label: string;        // Display label for the input field
  placeholder: string;
  defaultValue: string;
  left: number;         // % center X position
  top: number;          // % center Y position
  fontSize: number;     // px font size
  width: number;        // % width of text container
  color: string;        // text color
  fontWeight: string;   // font weight
  textTransform: string; // 'uppercase' | 'none'
  textShadow: string;   // text shadow style
  letterSpacing: string; // letter spacing
}

export interface PosterTemplate {
  id: string;
  name: string;          // Button label (e.g. "Mẫu 1")
  description: string;   // Short description
  backgroundImage: string; // Path to template background image
  aspectRatio: string;   // e.g. "925/462"
  imageSlots: ImageSlot[];
  textFields: TextField[];
}

const TEMPLATES: PosterTemplate[] = [
  {
    id: 'mau-1',
    name: 'Mẫu 1',
    description: 'Chúc mừng tháng',
    backgroundImage: '/posters/template-thang.png',
    aspectRatio: '925/462',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên',
        left: 5.5,
        top: 16,
        width: 27.5,
        height: 37,
        shape: 'circle',
        objectFit: 'cover',
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 68,
        top: 45.5,
        fontSize: 24,
        width: 55,
        color: '#ffffff',
        fontWeight: '800',
        textTransform: 'uppercase',
        textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.5)',
        letterSpacing: '0.08em',
      },
      {
        id: 'content',
        label: 'Nội dung',
        placeholder: 'VD: hoàn thành kế hoạch tháng',
        defaultValue: 'hoàn thành kế hoạch tháng',
        left: 68,
        top: 54,
        fontSize: 14,
        width: 55,
        color: '#e0e0e0',
        fontWeight: '500',
        textTransform: 'none',
        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        letterSpacing: '0.02em',
      },
    ],
  },
  {
    id: 'mau-2',
    name: 'Mẫu 2',
    description: 'Chúc mừng - 2 hình ảnh',
    backgroundImage: '/posters/template-mau2.png',
    aspectRatio: '1200/600',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên 1',
        left: 5,
        top: 15,
        width: 20,
        height: 35,
        shape: 'circle',
        objectFit: 'cover',
        draggable: true,
      },
      {
        id: 'photo-2',
        label: 'Hình nhân viên 2',
        left: 8,
        top: 48,
        width: 27,
        height: 27,
        shape: 'circle',
        objectFit: 'cover',
        draggable: true,
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 69.5,
        top: 42,
        fontSize: 22,
        width: 55,
        color: '#eeeae3',
        fontWeight: '700',
        textTransform: 'uppercase',
        textShadow: '0 2px 6px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.4)',
        letterSpacing: '0.06em',
      },
      {
        id: 'content',
        label: 'Nội dung',
        placeholder: 'VD: hoàn thành kế hoạch tháng',
        defaultValue: 'hoàn thành kế hoạch tháng',
        left: 69.5,
        top: 63,
        fontSize: 14,
        width: 55,
        color: '#bcb695',
        fontWeight: '400',
        textTransform: 'none',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        letterSpacing: '0.02em',
      },
    ],
  },
];

export default function VinhDanhPage() {
  const router = useRouter();
  const posterRef = useRef<HTMLDivElement>(null);

  // Current selected template
  const [activeTemplateId, setActiveTemplateId] = useState(TEMPLATES[0].id);
  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId) || TEMPLATES[0];

  // Image uploads (keyed by slot id)
  const [imageUploads, setImageUploads] = useState<Record<string, string>>({});

  // Text field values (keyed by field id)
  const [textValues, setTextValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    TEMPLATES.forEach(t => {
      t.textFields.forEach(f => {
        vals[`${t.id}-${f.id}`] = f.defaultValue;
      });
    });
    return vals;
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  // Position adjustments per field (keyed by templateId-fieldId)
  const [positionAdjustments, setPositionAdjustments] = useState<Record<string, { left: number; top: number; fontSize: number }>>({});

  // Image position adjustments (keyed by templateId-slotId) - for dragging photos within frames
  const [imagePositionAdjustments, setImagePositionAdjustments] = useState<Record<string, { offsetX: number; offsetY: number; scale: number }>>({});

  // Dragging state
  const [draggingImage, setDraggingImage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const getTextValue = (field: TextField) => textValues[`${activeTemplateId}-${field.id}`] ?? field.defaultValue;
  const setTextValue = (field: TextField, value: string) => {
    setTextValues(prev => ({ ...prev, [`${activeTemplateId}-${field.id}`]: value }));
  };

  const getPosition = (field: TextField) => {
    const key = `${activeTemplateId}-${field.id}`;
    const adj = positionAdjustments[key];
    return {
      left: adj?.left ?? field.left,
      top: adj?.top ?? field.top,
      fontSize: adj?.fontSize ?? field.fontSize,
    };
  };

  const setPosition = (field: TextField, prop: 'left' | 'top' | 'fontSize', value: number) => {
    const key = `${activeTemplateId}-${field.id}`;
    setPositionAdjustments(prev => ({
      ...prev,
      [key]: { ...prev[key], ...{ [prop]: value } },
    }));
  };

  const getImagePosition = (slotId: string) => {
    const key = `${activeTemplateId}-${slotId}`;
    const adj = imagePositionAdjustments[key];
    return {
      offsetX: adj?.offsetX ?? 0,
      offsetY: adj?.offsetY ?? 0,
      scale: adj?.scale ?? 1,
    };
  };

  const setImagePosition = (slotId: string, prop: 'offsetX' | 'offsetY' | 'scale', value: number) => {
    const key = `${activeTemplateId}-${slotId}`;
    setImagePositionAdjustments(prev => ({
      ...prev,
      [key]: { ...prev[key], ...{ [prop]: value } },
    }));
  };

  // Drag handlers for images within frames
  const handleImageMouseDown = useCallback((slotId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const imgPos = getImagePosition(slotId);
    setDraggingImage(slotId);
    setDragStart({ x: e.clientX, y: e.clientY, offsetX: imgPos.offsetX, offsetY: imgPos.offsetY });
  }, [activeTemplateId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingImage || !dragStart || !posterRef.current) return;
    const rect = posterRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
    setImagePositionAdjustments(prev => ({
      ...prev,
      [`${activeTemplateId}-${draggingImage}`]: {
        ...prev[`${activeTemplateId}-${draggingImage}`],
        offsetX: dragStart.offsetX + dx,
        offsetY: dragStart.offsetY + dy,
        scale: prev[`${activeTemplateId}-${draggingImage}`]?.scale ?? 1,
      },
    }));
  }, [draggingImage, dragStart, activeTemplateId]);

  const handleMouseUp = useCallback(() => {
    setDraggingImage(null);
    setDragStart(null);
  }, []);

  const handleImageUpload = useCallback((slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUploads(prev => ({ ...prev, [`${activeTemplateId}-${slotId}`]: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }, [activeTemplateId]);

  const handleDownload = useCallback(async () => {
    const nameField = activeTemplate.textFields.find(f => f.id === 'name');
    const nameValue = nameField ? getTextValue(nameField) : '';
    if (!nameValue.trim()) {
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
      const safeName = nameValue.trim().replace(/\s+/g, '_');
      link.download = `VinhDanh_${safeName}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Tải thành công!', description: `Đã tải poster vinh danh ${nameValue}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Lỗi tải', description: 'Không thể tạo ảnh, vui lòng thử lại', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  }, [activeTemplate]);

  const resetPositions = () => {
    const newAdj: Record<string, { left: number; top: number; fontSize: number }> = {};
    activeTemplate.textFields.forEach(f => {
      const key = `${activeTemplateId}-${f.id}`;
      newAdj[key] = { left: f.left, top: f.top, fontSize: f.fontSize };
    });
    setPositionAdjustments(prev => ({ ...prev, ...newAdj }));
    // Reset image positions too
    const newImgAdj: Record<string, { offsetX: number; offsetY: number; scale: number }> = {};
    activeTemplate.imageSlots.forEach(s => {
      const key = `${activeTemplateId}-${s.id}`;
      newImgAdj[key] = { offsetX: 0, offsetY: 0, scale: 1 };
    });
    setImagePositionAdjustments(prev => ({ ...prev, ...newImgAdj }));
  };

  const nameField = activeTemplate.textFields.find(f => f.id === 'name');
  const nameValue = nameField ? getTextValue(nameField) : '';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-md border-b border-purple-500/10">
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
        {/* Template Selection Buttons */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layout className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">Chọn mẫu poster</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setActiveTemplateId(template.id)}
                className={`px-4 py-2.5 text-sm font-bold rounded-none border transition-all ${
                  activeTemplateId === template.id
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black ${
                    activeTemplateId === template.id ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {TEMPLATES.indexOf(template) + 1}
                  </div>
                  <span>{template.name}</span>
                </div>
              </button>
            ))}
            {/* Placeholder for future templates */}
            <button
              className="px-4 py-2.5 text-sm rounded-none border border-dashed border-white/10 text-white/20 hover:border-purple-500/30 hover:text-purple-400/50 transition-colors cursor-default"
              title="Sẽ thêm mẫu mới sau"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-2">{activeTemplate.description}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT: Controls */}
          <div className="lg:w-[360px] flex-shrink-0 space-y-4">

            {/* Image Upload Slots */}
            {activeTemplate.imageSlots.map((slot, idx) => {
              const imageKey = `${activeTemplateId}-${slot.id}`;
              const imageUrl = imageUploads[imageKey] || null;

              return (
                <div key={slot.id} className="rounded-none border border-violet-500/20 bg-[#111827]/80 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-violet-400" />
                      <Label className="text-sm font-bold text-violet-300">{slot.label}</Label>
                      {activeTemplate.imageSlots.length > 1 && (
                        <span className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-sm">Hình {idx + 1}</span>
                      )}
                    </div>
                    {imageUrl && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400 hover:text-red-300" onClick={() => {
                        setImageUploads(prev => {
                          const copy = { ...prev };
                          delete copy[imageKey];
                          return copy;
                        });
                      }}>
                        Xóa hình
                      </Button>
                    )}
                  </div>

                  {imageUrl ? (
                    <div className="relative group">
                      <div className="flex justify-center">
                        <div className={`w-28 h-28 overflow-hidden border-2 border-violet-500/40 ${
                          slot.shape === 'circle' ? 'rounded-full' : slot.shape === 'rounded' ? 'rounded-lg' : 'rounded-none'
                        }`}>
                          <img src={imageUrl} alt={slot.label} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(slot.id, e)} className="hidden" />
                          <div className="px-3 py-2 bg-white/20 rounded-none text-white text-xs font-medium hover:bg-white/30 transition-colors">
                            <Upload className="w-3 h-3 inline mr-1" /> Thay hình
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(slot.id, e)} className="hidden" />
                      <div className="border-2 border-dashed border-violet-500/30 rounded-none p-6 text-center hover:border-violet-500/50 transition-colors">
                        <Upload className="w-8 h-8 text-violet-500/50 mx-auto mb-2" />
                        <p className="text-xs text-white/40">Nhấn để upload {slot.label.toLowerCase()}</p>
                        <p className="text-[10px] text-white/20 mt-1">JPG, PNG</p>
                      </div>
                    </label>
                  )}
                </div>
              );
            })}

            {/* Text Field Inputs */}
            {activeTemplate.textFields.map((field) => (
              <div key={field.id} className={`rounded-none border bg-[#111827]/80 p-4 ${
                field.id === 'name' ? 'border-amber-500/20' : 'border-emerald-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {field.id === 'name' ? (
                    <User className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Type className="w-4 h-4 text-emerald-400" />
                  )}
                  <Label className={`text-sm font-bold ${field.id === 'name' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {field.label}
                  </Label>
                </div>
                <Input
                  value={getTextValue(field)}
                  onChange={(e) => setTextValue(field, e.target.value)}
                  placeholder={field.placeholder}
                  className={`h-10 text-sm bg-white/5 text-white placeholder:text-white/30 ${
                    field.id === 'name'
                      ? 'border-amber-500/30 font-semibold uppercase'
                      : 'border-emerald-500/30'
                  }`}
                />
              </div>
            ))}

            {/* Position Control */}
            <div className="rounded-none border border-cyan-500/20 bg-[#111827]/80 p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowPositionControl(!showPositionControl)}
              >
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-cyan-400" />
                  <Label className="text-sm font-bold text-cyan-300">Điều chỉnh vị trí & kích cỡ</Label>
                </div>
                {showPositionControl ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>

              {showPositionControl && (
                <div className="mt-3 space-y-4">
                  {/* Image position/scale controls */}
                  {activeTemplate.imageSlots.map((slot) => {
                    const imgPos = getImagePosition(slot.id);
                    const imageKey = `${activeTemplateId}-${slot.id}`;
                    const hasImage = !!imageUploads[imageKey];

                    return (
                      <div key={slot.id} className={!hasImage ? 'opacity-40 pointer-events-none' : ''}>
                        <div className="text-[10px] font-bold uppercase mb-1 text-violet-400/60">
                          {slot.label} - Vị trí & kích cỡ
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-white/30">Di chuyển X</span>
                              <span className="text-[9px] text-cyan-400 font-mono">{imgPos.offsetX.toFixed(1)}%</span>
                            </div>
                            <input
                              type="range" min="-30" max="30" step="0.5"
                              value={imgPos.offsetX}
                              onChange={(e) => setImagePosition(slot.id, 'offsetX', parseFloat(e.target.value))}
                              className="w-full h-1 accent-cyan-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-white/30">Di chuyển Y</span>
                              <span className="text-[9px] text-cyan-400 font-mono">{imgPos.offsetY.toFixed(1)}%</span>
                            </div>
                            <input
                              type="range" min="-30" max="30" step="0.5"
                              value={imgPos.offsetY}
                              onChange={(e) => setImagePosition(slot.id, 'offsetY', parseFloat(e.target.value))}
                              className="w-full h-1 accent-cyan-500"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-white/30">Phóng to / Thu nhỏ</span>
                            <span className="text-[9px] text-cyan-400 font-mono">{imgPos.scale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range" min="0.5" max="3" step="0.05"
                            value={imgPos.scale}
                            onChange={(e) => setImagePosition(slot.id, 'scale', parseFloat(e.target.value))}
                            className="w-full h-1 accent-cyan-500"
                          />
                        </div>
                        <button
                          className="text-[9px] text-white/30 hover:text-white/50 mt-1"
                          onClick={() => setImagePositionAdjustments(prev => ({
                            ...prev,
                            [`${activeTemplateId}-${slot.id}`]: { offsetX: 0, offsetY: 0, scale: 1 },
                          }))}
                        >
                          Reset vị trí hình
                        </button>
                      </div>
                    );
                  })}

                  {/* Divider between image and text controls */}
                  {activeTemplate.imageSlots.length > 0 && activeTemplate.textFields.length > 0 && (
                    <div className="border-t border-white/5 my-1" />
                  )}

                  {/* Text position controls */}
                  {activeTemplate.textFields.map((field) => {
                    const pos = getPosition(field);
                    const isName = field.id === 'name';

                    return (
                      <div key={field.id}>
                        <div className={`text-[10px] font-bold uppercase mb-1 ${isName ? 'text-amber-400/60' : 'text-emerald-400/60'}`}>
                          {field.label}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-white/30">X</span>
                              <span className="text-[9px] text-cyan-400 font-mono">{pos.left}%</span>
                            </div>
                            <input
                              type="range" min="5" max="95"
                              value={pos.left}
                              onChange={(e) => setPosition(field, 'left', parseInt(e.target.value))}
                              className="w-full h-1 accent-cyan-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-white/30">Y</span>
                              <span className="text-[9px] text-cyan-400 font-mono">{pos.top}%</span>
                            </div>
                            <input
                              type="range" min="10" max="90"
                              value={pos.top}
                              onChange={(e) => setPosition(field, 'top', parseInt(e.target.value))}
                              className="w-full h-1 accent-cyan-500"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-white/30">Cỡ chữ</span>
                            <span className="text-[9px] text-cyan-400 font-mono">{pos.fontSize}px</span>
                          </div>
                          <input
                            type="range" min="8" max="48"
                            value={pos.fontSize}
                            onChange={(e) => setPosition(field, 'fontSize', parseInt(e.target.value))}
                            className="w-full h-1 accent-cyan-500"
                          />
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-white/40 hover:text-white border border-white/10 mt-1"
                    onClick={resetPositions}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset tất cả mặc định
                  </Button>
                </div>
              )}
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              disabled={isDownloading || !nameValue.trim()}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
            >
              {isDownloading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang tạo ảnh...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Tải poster vinh danh</>
              )}
            </Button>

            {!nameValue.trim() && (
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
                <span className="text-xs text-white/40 font-medium">Xem trước poster - {activeTemplate.name}</span>
                {nameValue.trim() && (
                  <span className="text-[10px] text-emerald-400/60">Sẵn sàng tải</span>
                )}
              </div>

              {/* Poster Preview Container */}
              <div
                className="relative bg-[#1a1a2e] rounded-none border border-white/10 overflow-hidden"
                style={{ aspectRatio: activeTemplate.aspectRatio }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div ref={posterRef} className="relative w-full h-full">
                  {/* Background Template Image */}
                  <img
                    src={activeTemplate.backgroundImage}
                    alt="Template"
                    className="absolute inset-0 w-full h-full object-fill"
                    crossOrigin="anonymous"
                  />

                  {/* Image Slot Overlays */}
                  {activeTemplate.imageSlots.map((slot) => {
                    const imageKey = `${activeTemplateId}-${slot.id}`;
                    const imageUrl = imageUploads[imageKey];
                    if (!imageUrl) return null;

                    const imgPos = getImagePosition(slot.id);

                    return (
                      <div
                        key={slot.id}
                        className="absolute overflow-hidden"
                        style={{
                          left: `${slot.left}%`,
                          top: `${slot.top}%`,
                          width: `${slot.width}%`,
                          height: `${slot.height}%`,
                        }}
                      >
                        <div
                          className={`w-full h-full ${slot.draggable ? 'cursor-move' : ''}`}
                          style={{
                            transform: `translate(${imgPos.offsetX}%, ${imgPos.offsetY}%) scale(${imgPos.scale})`,
                            transformOrigin: 'center center',
                          }}
                          onMouseDown={slot.draggable ? (e) => handleImageMouseDown(slot.id, e) : undefined}
                        >
                          <img
                            src={imageUrl}
                            alt={slot.label}
                            className={`w-full h-full ${slot.objectFit === 'cover' ? 'object-cover' : 'object-contain'} ${
                              slot.shape === 'circle' ? 'rounded-full' : slot.shape === 'rounded' ? 'rounded-lg' : 'rounded-none'
                            }`}
                            crossOrigin="anonymous"
                            draggable={false}
                          />
                        </div>
                        {/* Drag hint for draggable images */}
                        {slot.draggable && !draggingImage && (
                          <div className="absolute bottom-1 right-1 bg-black/50 text-white/60 text-[7px] px-1 py-0.5 rounded-sm pointer-events-none">
                            Kéo để di chuyển
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Text Field Overlays */}
                  {activeTemplate.textFields.map((field) => {
                    const value = getTextValue(field);
                    if (!value.trim()) return null;

                    const pos = getPosition(field);

                    return (
                      <div
                        key={field.id}
                        className="absolute text-center"
                        style={{
                          left: `${pos.left}%`,
                          top: `${pos.top}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${field.width}%`,
                        }}
                      >
                        <p
                          className="leading-tight"
                          style={{
                            fontSize: `${pos.fontSize}px`,
                            color: field.color,
                            fontWeight: field.fontWeight,
                            textTransform: field.textTransform as React.CSSProperties['textTransform'],
                            textShadow: field.textShadow,
                            letterSpacing: field.letterSpacing,
                          }}
                        >
                          {field.id === 'name' ? value.trim().toUpperCase() : value.trim()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick tips */}
              <div className="mt-4 rounded-none border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline text-amber-500/40 mr-1" />
                  <b className="text-white/40">Hướng dẫn:</b> Chọn mẫu → Upload hình (kéo để di chuyển ảnh trong khung) → Nhập tên & nội dung → Bấm tải. Điều chỉnh vị trí, kích cỡ chữ và ảnh trong phần &quot;Điều chỉnh vị trí & kích cỡ&quot;.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

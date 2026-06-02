'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Download, Upload, Award, Image as ImageIcon,
  User, Move, Type, RotateCcw, ChevronUp, ChevronDown,
  Sparkles, Camera, Layout, Minus, Plus, Crop,
  GripVertical, AlignCenter, AlignLeft, AlignRight,
} from 'lucide-react';
import { toPng } from 'html-to-image';

// ===== GOOGLE FONTS =====
// Load professional fonts matching the template designs
const FONT_FAMILIES = {
  serifDisplay: '"Noto Serif Display", "Playfair Display", Georgia, serif',
  script: '"Great Vibes", "Dancing Script", cursive',
  scriptAlt: '"Alex Brush", "Sacramento", cursive',
  sansSerif: '"Montserrat", "Noto Sans", sans-serif',
};

// ===== TEMPLATE CONFIGURATION =====
export interface ImageSlot {
  id: string;
  label: string;
  left: number;         // % position from left of poster
  top: number;          // % position from top of poster
  width: number;        // % width
  height: number;       // % height
  borderRadius: string; // CSS border-radius for the slot shape
  objectFit: 'cover' | 'contain';
  borderWidth?: number; // Optional border around image slot (px)
  borderColor?: string; // Border color
}

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
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: string;
}

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  backgroundImage: string;
  aspectRatio: string;
  imageSlots: ImageSlot[];
  textFields: TextField[];
}

// ===== ALL 5 TEMPLATES =====
const TEMPLATES: PosterTemplate[] = [
  // MẪU 1 - Chúc mừng tháng (company name at center top, congratulations script below, photo on left area)
  {
    id: 'mau-1',
    name: 'Mẫu 1',
    description: 'Chúc mừng tháng - Trang trọng',
    backgroundImage: '/posters/template-thang.png',
    aspectRatio: '2/1',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên',
        left: 8,
        top: 28,
        width: 18,
        height: 50,
        borderRadius: '8px',
        objectFit: 'cover',
        borderWidth: 2,
        borderColor: 'rgba(245,209,130,0.6)',
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên / Phòng ban',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 60,
        top: 52,
        fontSize: 28,
        width: 55,
        color: '#f5d182',
        fontWeight: '700',
        fontFamily: FONT_FAMILIES.serifDisplay,
        textTransform: 'uppercase',
        textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(245,209,130,0.3)',
        letterSpacing: '0.12em',
        textAlign: 'center',
        lineHeight: '1.3',
      },
      {
        id: 'content',
        label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc kế hoạch tháng',
        defaultValue: '',
        left: 60,
        top: 65,
        fontSize: 15,
        width: 50,
        color: '#e8d5a3',
        fontWeight: '400',
        fontFamily: FONT_FAMILIES.sansSerif,
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        letterSpacing: '0.04em',
        textAlign: 'center',
        lineHeight: '1.5',
      },
    ],
  },
  // MẪU 2 - 2 ảnh bên trái, nội dung bên phải
  {
    id: 'mau-2',
    name: 'Mẫu 2',
    description: 'Chúc mừng - 2 hình ảnh',
    backgroundImage: '/posters/template-mau2.png',
    aspectRatio: '2/1',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên 1',
        left: 4,
        top: 15,
        width: 24,
        height: 30,
        borderRadius: '8px',
        objectFit: 'cover',
        borderWidth: 2,
        borderColor: 'rgba(245,209,130,0.5)',
      },
      {
        id: 'photo-2',
        label: 'Hình nhân viên 2',
        left: 12,
        top: 42,
        width: 24,
        height: 30,
        borderRadius: '8px',
        objectFit: 'cover',
        borderWidth: 2,
        borderColor: 'rgba(245,209,130,0.5)',
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên / Phòng ban',
        placeholder: 'VD: PHÒNG PTKD 3',
        defaultValue: '',
        left: 66,
        top: 45,
        fontSize: 26,
        width: 50,
        color: '#f3e4af',
        fontWeight: '700',
        fontFamily: FONT_FAMILIES.serifDisplay,
        textTransform: 'uppercase',
        textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(243,228,175,0.25)',
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: '1.3',
      },
      {
        id: 'content',
        label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc kế hoạch quý',
        defaultValue: '',
        left: 66,
        top: 60,
        fontSize: 14,
        width: 45,
        color: '#d4c494',
        fontWeight: '400',
        fontFamily: FONT_FAMILIES.sansSerif,
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        letterSpacing: '0.03em',
        textAlign: 'center',
        lineHeight: '1.5',
      },
    ],
  },
  // MẪU 3 - Ảnh lớn bên trái, nội dung bên phải
  {
    id: 'mau-3',
    name: 'Mẫu 3',
    description: 'Chúc mừng - Ảnh lớn bên trái',
    backgroundImage: '/posters/template-mau3.png',
    aspectRatio: '2/1',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên',
        left: 6,
        top: 18,
        width: 28,
        height: 55,
        borderRadius: '6px',
        objectFit: 'cover',
        borderWidth: 2,
        borderColor: 'rgba(245,209,130,0.5)',
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên / Phòng ban',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 66,
        top: 50,
        fontSize: 26,
        width: 50,
        color: '#f3e4af',
        fontWeight: '700',
        fontFamily: FONT_FAMILIES.serifDisplay,
        textTransform: 'uppercase',
        textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(243,228,175,0.25)',
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: '1.3',
      },
      {
        id: 'content',
        label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc kế hoạch',
        defaultValue: '',
        left: 66,
        top: 63,
        fontSize: 14,
        width: 45,
        color: '#d4c494',
        fontWeight: '400',
        fontFamily: FONT_FAMILIES.sansSerif,
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        letterSpacing: '0.03em',
        textAlign: 'center',
        lineHeight: '1.5',
      },
    ],
  },
  // MẪU 4 - Nội dung bên trái, ảnh lớn bên phải
  {
    id: 'mau-4',
    name: 'Mẫu 4',
    description: 'Nội dung trái - Ảnh lớn phải',
    backgroundImage: '/posters/template-mau4.png',
    aspectRatio: '2/1',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên 1',
        left: 22,
        top: 78,
        width: 5,
        height: 10,
        borderRadius: '50%',
        objectFit: 'cover',
        borderWidth: 1,
        borderColor: 'rgba(245,209,130,0.4)',
      },
      {
        id: 'photo-2',
        label: 'Hình nhân viên 2',
        left: 32,
        top: 78,
        width: 5,
        height: 10,
        borderRadius: '50%',
        objectFit: 'cover',
        borderWidth: 1,
        borderColor: 'rgba(245,209,130,0.4)',
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên / Phòng ban',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 28,
        top: 55,
        fontSize: 26,
        width: 40,
        color: '#ffffff',
        fontWeight: '700',
        fontFamily: FONT_FAMILIES.serifDisplay,
        textTransform: 'uppercase',
        textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 15px rgba(255,255,255,0.15)',
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: '1.3',
      },
      {
        id: 'content',
        label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc kế hoạch',
        defaultValue: '',
        left: 28,
        top: 68,
        fontSize: 14,
        width: 35,
        color: '#d4c494',
        fontWeight: '400',
        fontFamily: FONT_FAMILIES.sansSerif,
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        letterSpacing: '0.03em',
        textAlign: 'center',
        lineHeight: '1.5',
      },
    ],
  },
  // MẪU 5 - Ảnh lớn bên trái (có viền trang trí)
  {
    id: 'mau-5',
    name: 'Mẫu 5',
    description: 'Ảnh viền trang trí - Nội dung phải',
    backgroundImage: '/posters/template-mau5.png',
    aspectRatio: '2/1',
    imageSlots: [
      {
        id: 'photo-1',
        label: 'Hình nhân viên',
        left: 7,
        top: 22,
        width: 25,
        height: 48,
        borderRadius: '4px',
        objectFit: 'cover',
        borderWidth: 0,
      },
    ],
    textFields: [
      {
        id: 'name',
        label: 'Tên nhân viên / Phòng ban',
        placeholder: 'VD: NGUYỄN MINH CHÂU',
        defaultValue: '',
        left: 66,
        top: 50,
        fontSize: 26,
        width: 50,
        color: '#f3e4af',
        fontWeight: '700',
        fontFamily: FONT_FAMILIES.serifDisplay,
        textTransform: 'uppercase',
        textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(243,228,175,0.25)',
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: '1.3',
      },
      {
        id: 'content',
        label: 'Nội dung vinh danh',
        placeholder: 'VD: Hoàn thành xuất sắc kế hoạch',
        defaultValue: '',
        left: 66,
        top: 63,
        fontSize: 14,
        width: 45,
        color: '#d4c494',
        fontWeight: '400',
        fontFamily: FONT_FAMILIES.sansSerif,
        textTransform: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        letterSpacing: '0.03em',
        textAlign: 'center',
        lineHeight: '1.5',
      },
    ],
  },
];

export default function VinhDanhPage() {
  const router = useRouter();
  const posterRef = useRef<HTMLDivElement>(null);
  const posterContainerRef = useRef<HTMLDivElement>(null);

  const [activeTemplateId, setActiveTemplateId] = useState(TEMPLATES[0].id);
  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId) || TEMPLATES[0];

  // Image uploads keyed by templateId-slotId
  const [imageUploads, setImageUploads] = useState<Record<string, string>>({});

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

  const [isDownloading, setIsDownloading] = useState(false);
  const [showPositionControl, setShowPositionControl] = useState(false);

  // Position overrides per field keyed by templateId-fieldId
  const [positionOverrides, setPositionOverrides] = useState<Record<string, {
    left: number; top: number; fontSize: number;
  }>>({});

  // Image pan/zoom keyed by templateId-slotId
  const [imagePanZoom, setImagePanZoom] = useState<Record<string, {
    panX: number; panY: number; zoom: number;
  }>>({});

  // Dragging state for images (pan within frame)
  const [draggingImage, setDraggingImage] = useState<string | null>(null);
  const [imgDragStart, setImgDragStart] = useState<{
    clientX: number; clientY: number; panX: number; panY: number;
  } | null>(null);

  // Dragging state for text fields
  const [draggingText, setDraggingText] = useState<string | null>(null);
  const [textDragStart, setTextDragStart] = useState<{
    clientX: number; clientY: number; left: number; top: number;
  } | null>(null);

  // Selected text field for controls
  const [selectedTextField, setSelectedTextField] = useState<string | null>(null);

  const getTextValue = (field: TextField) =>
    textValues[`${activeTemplateId}-${field.id}`] ?? field.defaultValue;

  const setTextValue = (field: TextField, value: string) => {
    setTextValues(prev => ({ ...prev, [`${activeTemplateId}-${field.id}`]: value }));
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

  const getImgPZ = (slotId: string) => {
    const key = `${activeTemplateId}-${slotId}`;
    const pz = imagePanZoom[key];
    return { panX: pz?.panX ?? 0, panY: pz?.panY ?? 0, zoom: pz?.zoom ?? 1 };
  };

  const setImgPZ = (slotId: string, prop: 'panX' | 'panY' | 'zoom', value: number) => {
    const key = `${activeTemplateId}-${slotId}`;
    setImagePanZoom(prev => ({
      ...prev,
      [key]: { ...prev[key], ...{ [prop]: value } },
    }));
  };

  // ===== DRAG HANDLERS FOR TEXT ON POSTER =====
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

  // ===== DRAG HANDLERS FOR IMAGE PAN WITHIN FRAME =====
  const handleImgMouseDown = useCallback((slotId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pz = getImgPZ(slotId);
    setDraggingImage(slotId);
    setImgDragStart({ clientX: e.clientX, clientY: e.clientY, panX: pz.panX, panY: pz.panY });
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
            fontSize: prev[key]?.fontSize ?? activeTemplate.textFields.find(f => f.id === draggingText)?.fontSize ?? 20,
          },
        }));
      }
      if (draggingImage && imgDragStart && posterRef.current) {
        const rect = posterRef.current.getBoundingClientRect();
        const dx = ((e.clientX - imgDragStart.clientX) / rect.width) * 100;
        const dy = ((e.clientY - imgDragStart.clientY) / rect.height) * 100;
        const key = `${activeTemplateId}-${draggingImage}`;
        setImagePanZoom(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            panX: imgDragStart.panX + dx * 2,
            panY: imgDragStart.panY + dy * 2,
            zoom: prev[key]?.zoom ?? 1,
          },
        }));
      }
    };

    const handleMouseUp = () => {
      setDraggingText(null);
      setTextDragStart(null);
      setDraggingImage(null);
      setImgDragStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingText, textDragStart, draggingImage, imgDragStart, activeTemplateId]);

  // ===== IMAGE UPLOAD =====
  const handleImageUpload = useCallback((slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUploads(prev => ({ ...prev, [`${activeTemplateId}-${slotId}`]: ev.target?.result as string }));
      // Reset pan/zoom for this slot
      setImagePanZoom(prev => ({
        ...prev,
        [`${activeTemplateId}-${slotId}`]: { panX: 0, panY: 0, zoom: 1 },
      }));
    };
    reader.readAsDataURL(file);
  }, [activeTemplateId]);

  // ===== DOWNLOAD =====
  const handleDownload = useCallback(async () => {
    const nameField = activeTemplate.textFields.find(f => f.id === 'name');
    const nameValue = nameField ? getTextValue(nameField) : '';
    if (!nameValue.trim()) {
      toast({ title: 'Chưa nhập tên', description: 'Vui lòng nhập tên nhân viên hoặc phòng ban', variant: 'destructive' });
      return;
    }

    setIsDownloading(true);
    try {
      if (!posterRef.current) return;
      // Hide selection borders before capture
      const dataUrl = await toPng(posterRef.current, {
        quality: 1.0,
        pixelRatio: 3,
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
    const newOvr: Record<string, { left: number; top: number; fontSize: number }> = {};
    activeTemplate.textFields.forEach(f => {
      const key = `${activeTemplateId}-${f.id}`;
      newOvr[key] = { left: f.left, top: f.top, fontSize: f.fontSize };
    });
    setPositionOverrides(prev => ({ ...prev, ...newOvr }));
    const newPZ: Record<string, { panX: number; panY: number; zoom: number }> = {};
    activeTemplate.imageSlots.forEach(s => {
      const key = `${activeTemplateId}-${s.id}`;
      newPZ[key] = { panX: 0, panY: 0, zoom: 1 };
    });
    setImagePanZoom(prev => ({ ...prev, ...newPZ }));
  };

  const nameField = activeTemplate.textFields.find(f => f.id === 'name');
  const nameValue = nameField ? getTextValue(nameField) : '';

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Noto+Serif+Display:wght@400;600;700&family=Playfair+Display:wght@400;700;800&family=Alex+Brush&family=Dancing+Script:wght@400;700&family=Montserrat:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0d0d1a] to-[#0a0a12] text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur-md border-b border-amber-500/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-white/50 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-1" /> Trang chủ
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Award className="w-5 h-5 text-amber-900" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent tracking-wide">
                  VINH DANH
                </h1>
                <p className="text-[9px] text-amber-500/40 tracking-widest uppercase">Tạo poster chúc mừng</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Template Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-amber-400/70" />
              <span className="text-sm font-semibold text-amber-300/80 tracking-wide">Chọn mẫu poster</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map((template, idx) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setActiveTemplateId(template.id);
                    setSelectedTextField(null);
                  }}
                  className={`px-4 py-2.5 text-sm font-bold rounded-lg border transition-all duration-200 ${
                    activeTemplateId === template.id
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white border-amber-500 shadow-lg shadow-amber-500/25'
                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-amber-500/10 hover:text-white/60 hover:border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
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
            <p className="text-[10px] text-amber-500/30 mt-2 tracking-wide">{activeTemplate.description}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT: Controls Panel */}
            <div className="lg:w-[380px] flex-shrink-0 space-y-3">

              {/* Image Upload Slots */}
              {activeTemplate.imageSlots.map((slot, idx) => {
                const imageKey = `${activeTemplateId}-${slot.id}`;
                const imageUrl = imageUploads[imageKey] || null;
                const pz = getImgPZ(slot.id);

                return (
                  <div key={slot.id} className="rounded-xl border border-amber-500/15 bg-[#0f0f1a]/90 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-400/70" />
                        <Label className="text-sm font-semibold text-amber-300/80">{slot.label}</Label>
                        {activeTemplate.imageSlots.length > 1 && (
                          <span className="text-[9px] text-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 rounded">Hình {idx + 1}</span>
                        )}
                      </div>
                      {imageUrl && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-400/70 hover:text-red-300" onClick={() => {
                          setImageUploads(prev => {
                            const copy = { ...prev };
                            delete copy[imageKey];
                            return copy;
                          });
                          setImagePanZoom(prev => {
                            const copy = { ...prev };
                            delete copy[imageKey];
                            return copy;
                          });
                        }}>
                          Xóa
                        </Button>
                      )}
                    </div>

                    {imageUrl ? (
                      <div className="space-y-2">
                        <div className="relative group">
                          <div className="flex justify-center">
                            <div
                              className="w-24 h-24 overflow-hidden border-2 border-amber-500/30"
                              style={{ borderRadius: slot.borderRadius }}
                            >
                              <img src={imageUrl} alt={slot.label} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(slot.id, e)} className="hidden" />
                              <div className="px-3 py-1.5 bg-white/20 rounded-lg text-white text-xs font-medium hover:bg-white/30 transition-colors">
                                <Upload className="w-3 h-3 inline mr-1" /> Thay hình
                              </div>
                            </label>
                          </div>
                        </div>
                        {/* Image pan/zoom controls */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/25">Dịch chuyển ảnh</span>
                            <span className="text-[9px] text-amber-400/50 font-mono">X:{pz.panX.toFixed(0)} Y:{pz.panY.toFixed(0)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input type="range" min="-50" max="50" step="1" value={pz.panX}
                              onChange={(e) => setImgPZ(slot.id, 'panX', parseFloat(e.target.value))}
                              className="w-full h-1 accent-amber-500" />
                            <input type="range" min="-50" max="50" step="1" value={pz.panY}
                              onChange={(e) => setImgPZ(slot.id, 'panY', parseFloat(e.target.value))}
                              className="w-full h-1 accent-amber-500" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/25">Phóng to / Thu nhỏ</span>
                            <span className="text-[9px] text-amber-400/50 font-mono">{pz.zoom.toFixed(2)}x</span>
                          </div>
                          <input type="range" min="0.5" max="3" step="0.05" value={pz.zoom}
                            onChange={(e) => setImgPZ(slot.id, 'zoom', parseFloat(e.target.value))}
                            className="w-full h-1 accent-amber-500" />
                          <button className="text-[9px] text-white/25 hover:text-white/50"
                            onClick={() => setImgPZ(slot.id, 'panX', 0) || setImgPZ(slot.id, 'panY', 0) || setImgPZ(slot.id, 'zoom', 1)}>
                            Reset vị trí ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(slot.id, e)} className="hidden" />
                        <div className="border-2 border-dashed border-amber-500/20 rounded-xl p-5 text-center hover:border-amber-500/40 transition-colors">
                          <Upload className="w-7 h-7 text-amber-500/30 mx-auto mb-2" />
                          <p className="text-xs text-white/30">Nhấn để upload {slot.label.toLowerCase()}</p>
                          <p className="text-[10px] text-white/15 mt-1">JPG, PNG</p>
                        </div>
                      </label>
                    )}
                  </div>
                );
              })}

              {/* Text Field Inputs */}
              {activeTemplate.textFields.map((field) => {
                const isSelected = selectedTextField === field.id;
                return (
                  <div key={field.id} className={`rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-amber-500/40 bg-[#0f0f1a]/90'
                      : field.id === 'name' ? 'border-amber-500/15 bg-[#0f0f1a]/90' : 'border-yellow-500/15 bg-[#0f0f1a]/90'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {field.id === 'name' ? (
                          <User className="w-4 h-4 text-amber-400/70" />
                        ) : (
                          <Type className="w-4 h-4 text-yellow-400/70" />
                        )}
                        <Label className={`text-sm font-semibold ${field.id === 'name' ? 'text-amber-300/80' : 'text-yellow-300/80'}`}>
                          {field.label}
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const pos = getPos(field);
                            setPos(field, 'fontSize', Math.max(8, pos.fontSize - 1));
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-amber-400/50 font-mono w-8 text-center">{getPos(field).fontSize}px</span>
                        <button
                          onClick={() => {
                            const pos = getPos(field);
                            setPos(field, 'fontSize', Math.min(60, pos.fontSize + 1));
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
                      className={`h-10 text-sm bg-white/5 text-white placeholder:text-white/20 border-amber-500/20 focus:border-amber-500/40 ${
                        field.id === 'name' ? 'font-semibold uppercase' : ''
                      }`}
                      style={{ fontFamily: field.fontFamily }}
                    />
                    {/* Quick font size & position for selected text */}
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-white/20">X:</span>
                          <input type="range" min="5" max="95" value={getPos(field).left}
                            onChange={(e) => setPos(field, 'left', parseInt(e.target.value))}
                            className="w-16 h-1 accent-amber-500" />
                          <span className="text-[9px] text-amber-400/40 font-mono w-6">{getPos(field).left}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-white/20">Y:</span>
                          <input type="range" min="5" max="95" value={getPos(field).top}
                            onChange={(e) => setPos(field, 'top', parseInt(e.target.value))}
                            className="w-16 h-1 accent-amber-500" />
                          <span className="text-[9px] text-amber-400/40 font-mono w-6">{getPos(field).top}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Advanced Position Control (collapsible) */}
              <div className="rounded-xl border border-white/5 bg-[#0f0f1a]/90 p-4">
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => setShowPositionControl(!showPositionControl)}
                >
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-white/30" />
                    <Label className="text-sm font-semibold text-white/40">Điều chỉnh chi tiết</Label>
                  </div>
                  {showPositionControl ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                </button>

                {showPositionControl && (
                  <div className="mt-3 space-y-4">
                    {activeTemplate.textFields.map((field) => {
                      const pos = getPos(field);
                      return (
                        <div key={field.id}>
                          <div className={`text-[10px] font-bold uppercase mb-1 ${field.id === 'name' ? 'text-amber-400/40' : 'text-yellow-400/40'}`}>
                            {field.label}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] text-white/20">X</span>
                                <span className="text-[8px] text-amber-400/40 font-mono">{pos.left}%</span>
                              </div>
                              <input type="range" min="5" max="95" value={pos.left}
                                onChange={(e) => setPos(field, 'left', parseInt(e.target.value))}
                                className="w-full h-1 accent-amber-500" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] text-white/20">Y</span>
                                <span className="text-[8px] text-amber-400/40 font-mono">{pos.top}%</span>
                              </div>
                              <input type="range" min="5" max="95" value={pos.top}
                                onChange={(e) => setPos(field, 'top', parseInt(e.target.value))}
                                className="w-full h-1 accent-amber-500" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] text-white/20">Cỡ</span>
                                <span className="text-[8px] text-amber-400/40 font-mono">{pos.fontSize}px</span>
                              </div>
                              <input type="range" min="8" max="60" value={pos.fontSize}
                                onChange={(e) => setPos(field, 'fontSize', parseInt(e.target.value))}
                                className="w-full h-1 accent-amber-500" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-[10px] text-white/30 hover:text-white/50 border border-white/5 mt-1"
                      onClick={resetPositions}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Reset mặc định
                    </Button>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !nameValue.trim()}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg rounded-xl"
                style={{ boxShadow: '0 4px 25px rgba(245,158,11,0.3)' }}
              >
                {isDownloading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Đang tạo ảnh...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Tải poster vinh danh</>
                )}
              </Button>

              {!nameValue.trim() && (
                <div className="text-center py-2 px-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[10px] text-amber-400/50">Nhập tên nhân viên hoặc phòng ban để tải poster</p>
                </div>
              )}

              {/* Tips */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="text-[10px] text-white/20 leading-relaxed">
                  <Sparkles className="w-3 h-3 inline text-amber-500/30 mr-1" />
                  <b className="text-white/30">Hướng dẫn:</b> Chọn mẫu &rarr; Upload hình &rarr; Nhập tên &amp; nội dung &rarr; Kéo chữ trên poster để điều chỉnh vị trí &rarr; Bấm tải. Dùng thanh trượt để căn chỉnh chi tiết.
                </p>
              </div>
            </div>

            {/* RIGHT: Poster Preview */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full max-w-[750px]">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-amber-500/30" />
                  <span className="text-xs text-white/30 font-medium">Xem trước - {activeTemplate.name}</span>
                  {nameValue.trim() && (
                    <span className="text-[10px] text-emerald-400/50 ml-auto">Sẵn sàng tải</span>
                  )}
                </div>

                {/* Poster Preview Container */}
                <div
                  ref={posterContainerRef}
                  className="relative bg-[#080810] rounded-xl border border-amber-500/10 overflow-hidden shadow-2xl shadow-amber-500/5"
                  style={{ aspectRatio: activeTemplate.aspectRatio }}
                >
                  <div ref={posterRef} className="relative w-full h-full select-none">
                    {/* Background Template Image */}
                    <img
                      src={activeTemplate.backgroundImage}
                      alt="Template"
                      className="absolute inset-0 w-full h-full object-fill"
                      crossOrigin="anonymous"
                      draggable={false}
                    />

                    {/* Image Slot Overlays */}
                    {activeTemplate.imageSlots.map((slot) => {
                      const imageKey = `${activeTemplateId}-${slot.id}`;
                      const imageUrl = imageUploads[imageKey];
                      const pz = getImgPZ(slot.id);

                      return (
                        <div
                          key={slot.id}
                          className="absolute overflow-hidden"
                          style={{
                            left: `${slot.left}%`,
                            top: `${slot.top}%`,
                            width: `${slot.width}%`,
                            height: `${slot.height}%`,
                            borderRadius: slot.borderRadius,
                            border: slot.borderWidth ? `${slot.borderWidth}px solid ${slot.borderColor || 'rgba(245,209,130,0.5)'}` : 'none',
                          }}
                        >
                          {imageUrl ? (
                            <div
                              className="w-full h-full cursor-move"
                              onMouseDown={(e) => handleImgMouseDown(slot.id, e)}
                            >
                              <img
                                src={imageUrl}
                                alt={slot.label}
                                crossOrigin="anonymous"
                                draggable={false}
                                className="w-full h-full"
                                style={{
                                  objectFit: 'cover',
                                  transform: `translate(${pz.panX}%, ${pz.panY}%) scale(${pz.zoom})`,
                                  transformOrigin: 'center center',
                                  minWidth: '100%',
                                  minHeight: '100%',
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/40 transition-colors">
                              <div className="text-center">
                                <Camera className="w-6 h-6 text-white/20 mx-auto mb-1" />
                                <p className="text-[8px] text-white/20">Upload hình</p>
                              </div>
                            </div>
                          )}
                          {imageUrl && !draggingImage && (
                            <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white/40 text-[6px] px-1 py-0.5 rounded pointer-events-none">
                              Kéo để di chuyển
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Text Field Overlays - DRAGGABLE */}
                    {activeTemplate.textFields.map((field) => {
                      const value = getTextValue(field);
                      if (!value.trim()) return null;

                      const pos = getPos(field);
                      const isSelected = selectedTextField === field.id;

                      return (
                        <div
                          key={field.id}
                          className={`absolute text-center cursor-move group ${isSelected ? 'z-20' : 'z-10'}`}
                          style={{
                            left: `${pos.left}%`,
                            top: `${pos.top}%`,
                            transform: 'translate(-50%, -50%)',
                            width: `${field.width}%`,
                          }}
                          onMouseDown={(e) => handleTextMouseDown(field.id, e)}
                        >
                          <p
                            className="leading-tight transition-shadow duration-150"
                            style={{
                              fontSize: `${pos.fontSize}px`,
                              color: field.color,
                              fontWeight: field.fontWeight,
                              fontFamily: field.fontFamily,
                              textTransform: field.textTransform as React.CSSProperties['textTransform'],
                              textShadow: field.textShadow,
                              letterSpacing: field.letterSpacing,
                              fontStyle: field.fontStyle || 'normal',
                              textAlign: (field.textAlign as React.CSSProperties['textAlign']) || 'center',
                              lineHeight: field.lineHeight || '1.3',
                            }}
                          >
                            {field.id === 'name' ? value.trim().toUpperCase() : value.trim()}
                          </p>
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute -inset-1 border border-dashed border-amber-400/50 rounded pointer-events-none" />
                          )}
                          {/* Drag handle hint */}
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <GripVertical className="w-3 h-3 text-amber-400/40" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interaction tips below poster */}
                <div className="mt-3 flex items-center justify-center gap-4 text-[9px] text-white/15">
                  <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Kéo chữ trên poster</span>
                  <span className="flex items-center gap-1"><Crop className="w-3 h-3" /> Kéo ảnh trong khung</span>
                  <span className="flex items-center gap-1"><Type className="w-3 h-3" /> Thanh trượt chỉnh chi tiết</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

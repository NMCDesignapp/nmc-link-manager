'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { ContestCommunication } from '@/lib/contest-communication';

export function ContestCommunicationDialog({ message, onClose }: { message: ContestCommunication | null; onClose: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const copy = async () => {
    if (!message) return;
    try {
      // Rich HTML where supported; plain text keeps Vietnamese and emoji intact
      // when the destination (such as a social post) drops rich formatting.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write && card.current) {
        try {
          await navigator.clipboard.write([new ClipboardItem({
            'text/plain': new Blob([message.text], { type: 'text/plain' }),
            'text/html': new Blob([card.current.outerHTML], { type: 'text/html' }),
          })]);
        } catch { await navigator.clipboard.writeText(message.text); }
      } else { await navigator.clipboard.writeText(message.text); }
      toast({ title: 'Đã sao chép tin truyền thông' });
    } catch { toast({ title: 'Không sao chép được', description: 'Anh/Chị có thể chọn nội dung bên dưới và sao chép thủ công.', variant: 'destructive' }); }
  };
  const download = async () => {
    if (!card.current || !message) return;
    setBusy(true);
    let wrapper: HTMLDivElement | null = null;
    try {
      await document.fonts.ready;
      const { toBlob } = await import('html-to-image');
      wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;pointer-events:none;';
      const clone = card.current.cloneNode(true) as HTMLDivElement;
      clone.style.width = '760px';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      const blob = await toBlob(clone, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
      if (!blob) throw new Error('Không tạo được ảnh');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tin-truyen-thong-thi-dua.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'Đã tải ảnh tin truyền thông' });
    } catch { toast({ title: 'Không tải được ảnh tin', description: 'Vui lòng thử lại hoặc dùng Sao chép tin.', variant: 'destructive' }); }
    finally { wrapper?.remove(); setBusy(false); }
  };
  return <Dialog open={Boolean(message)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-white text-slate-900">
      <DialogHeader>
        <DialogTitle>Tin truyền thông thi đua</DialogTitle>
        <DialogDescription>Sao chép lời dẫn để đăng cùng poster, hoặc tải ảnh để giữ màu sắc và chữ đậm.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>📋 Sao chép tin</Button>
        <Button variant="outline" onClick={download} disabled={busy}>{busy ? 'Đang tạo ảnh…' : '🖼️ Tải ảnh tin'}</Button>
      </div>
      <div ref={card} data-testid="contest-communication" style={{ boxSizing: 'border-box', padding: 24, borderRadius: 16, border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', fontFamily: 'Arial, "Segoe UI Emoji", sans-serif', fontSize: 16, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
        {message?.lines.map((line, i) => <p key={i} style={{ margin: '0 0 12px', fontWeight: line.emphasis ? 700 : 400, fontSize: line.tone === 'title' ? 20 : 16, color: line.tone === 'urgent' ? '#b91c1c' : line.tone === 'title' ? '#047857' : '#1e293b', background: line.tone === 'urgent' ? '#fff7ed' : 'transparent', padding: line.tone === 'urgent' ? 12 : 0, borderRadius: 8 }}>{line.emphasis ? <strong>{line.text}</strong> : line.text}</p>)}
      </div>
    </DialogContent>
  </Dialog>;
}

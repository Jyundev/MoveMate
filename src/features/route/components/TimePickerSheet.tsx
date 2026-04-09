'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  value: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

const ITEM_H = 48;
const VISIBLE = 7; // 선택 행 포함 위아래 3칸씩
const PAD = Math.floor(VISIBLE / 2); // 3

const PERIODS = ['오전', '오후'];
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parse(value: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    const now = new Date();
    const h = now.getHours();
    return { pIdx: h < 12 ? 0 : 1, hIdx: (h % 12 || 12) - 1, mIdx: now.getMinutes() };
  }
  const [h, m] = value.split(':').map(Number);
  return { pIdx: h < 12 ? 0 : 1, hIdx: (h % 12 || 12) - 1, mIdx: m };
}

function to24h(pIdx: number, hIdx: number, mIdx: number) {
  let h = (hIdx + 1) % 12;
  if (pIdx === 1) h += 12;
  return `${String(h).padStart(2, '0')}:${String(mIdx).padStart(2, '0')}`;
}

// ── 드럼 피커 ──────────────────────────────────────────────────────
type DrumProps = {
  items: string[];
  initialIndex: number;
  onSelect: (index: number) => void;
  flex?: string;
};

function DrumPicker({ items, initialIndex, onSelect, flex = 'flex-1' }: DrumProps) {
  const ref  = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerH = VISIBLE * ITEM_H;
  const padH = PAD * ITEM_H;

  // 최초 위치
  useEffect(() => {
    ref.current?.scrollTo({ top: initialIndex * ITEM_H, behavior: 'instant' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(Math.round(el.scrollTop / ITEM_H), items.length - 1));
      // snap
      el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
      onSelect(idx);
    }, 80);
  };

  return (
    <div className={`relative ${flex} overflow-hidden`} style={{ height: containerH }}>
      {/* 선택 행 배경 — 스크롤 컨테이너보다 먼저(뒤에) 렌더링 */}
      <div
        className="absolute inset-x-0 pointer-events-none bg-gray-100 rounded-2xl mx-1"
        style={{ top: padH, height: ITEM_H }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="relative h-full overflow-y-scroll scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div style={{ height: padH }} />
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center font-semibold text-gray-800 cursor-pointer select-none"
            style={{ height: ITEM_H, scrollSnapAlign: 'center', fontSize: 20 }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: padH }} />
      </div>

      {/* 그라데이션 — 스크롤 컨테이너 위에 */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: padH, background: 'linear-gradient(to bottom, white 40%, transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: padH, background: 'linear-gradient(to top, white 40%, transparent)' }}
      />
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────────
export default function TimePickerSheet({ value, onConfirm, onClose }: Props) {
  const init = parse(value);
  const [pIdx, setPIdx] = useState(init.pIdx);
  const [hIdx, setHIdx] = useState(init.hIdx);
  const [mIdx, setMIdx] = useState(init.mIdx);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleConfirm = () => {
    onConfirm(to24h(pIdx, hIdx, mIdx));
    onClose();
  };

  // 헤더 프리뷰
  const previewH = hIdx + 1;
  const previewM = String(mIdx).padStart(2, '0');
  const preview  = `${pIdx === 0 ? '오전' : '오후'} ${previewH}:${previewM}`;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <div
        className="relative w-full max-w-[480px] mx-auto bg-white rounded-t-3xl pt-3 pb-8 px-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-semibold text-gray-800">도착 희망 시간</p>
          <span className="bg-blue-50 text-blue-500 text-[14px] font-bold px-3 py-1 rounded-full tabular-nums">
            {preview}
          </span>
        </div>

        {/* 드럼 피커 */}
        <div className="flex items-center">
          <DrumPicker
            items={PERIODS}
            initialIndex={init.pIdx}
            onSelect={setPIdx}
            flex="w-[72px] shrink-0"
          />
          <DrumPicker items={HOURS}   initialIndex={init.hIdx} onSelect={setHIdx} />
          {/* 구분자 */}
          <span className="text-[22px] font-bold text-gray-300 shrink-0 mb-0.5">:</span>
          <DrumPicker items={MINUTES} initialIndex={init.mIdx} onSelect={setMIdx} />
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-500 text-[15px] font-semibold active:opacity-70 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-2 py-3.5 rounded-2xl bg-blue-500 text-white text-[15px] font-semibold active:bg-blue-700 transition"
          >
            이 시간으로 설정
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  value: string; // "HH:mm" 24h
  onConfirm: (value: string) => void;
  onClose: () => void;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12
const MINUTES = [0, 10, 20, 30, 40, 50];

function to24h(period: 'AM' | 'PM', hour: number, minute: number): string {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parse(value: string): { period: 'AM' | 'PM'; hour: number; minute: number } {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    const now = new Date();
    const h = now.getHours();
    const m = Math.round(now.getMinutes() / 10) * 10 % 60;
    return { period: h < 12 ? 'AM' : 'PM', hour: h % 12 || 12, minute: m };
  }
  const [h, m] = value.split(':').map(Number);
  return { period: h < 12 ? 'AM' : 'PM', hour: h % 12 || 12, minute: Math.round(m / 10) * 10 % 60 };
}

export default function TimePickerSheet({ value, onConfirm, onClose }: Props) {
  const init = parse(value);
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);

  // 바깥 스크롤 막기
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleConfirm = () => {
    onConfirm(to24h(period, hour, minute));
    onClose();
  };

  const displayHour = String(hour).padStart(2, '0');
  const displayMin = String(minute).padStart(2, '0');

  const content = (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
      />
      <div
        className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-6 space-y-4 max-w-[480px] mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        {/* 헤더 + 프리뷰 */}
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-gray-700">도착 희망 시간</p>
          <span className="text-[22px] font-bold text-blue-500 tabular-nums">
            {period === 'AM' ? '오전' : '오후'} {displayHour}:{displayMin}
          </span>
        </div>

        {/* 오전 / 오후 */}
        <div className="flex gap-2">
          {(['AM', 'PM'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                'flex-1 py-2 rounded-xl text-[13px] font-semibold border transition',
                period === p
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500',
              ].join(' ')}
            >
              {p === 'AM' ? '오전' : '오후'}
            </button>
          ))}
        </div>

        {/* 시 선택 */}
        <div>
          <p className="text-[11px] text-gray-400 mb-1.5 text-center tracking-wide">시</p>
          <div className="grid grid-cols-6 gap-1">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHour(h)}
                className={[
                  'py-2 rounded-lg text-[13px] font-medium border transition',
                  hour === h
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* 분 선택 */}
        <div>
          <p className="text-[11px] text-gray-400 mb-1.5 text-center tracking-wide">분</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                className={[
                  'py-2 rounded-lg text-[13px] font-medium border transition',
                  minute === m
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-[13px] font-semibold hover:bg-blue-600 transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

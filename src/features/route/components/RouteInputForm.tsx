'use client';

import { HUBS, getSubDestinations } from '@/config/demoPlaces';
import { RouteInputSchema } from '@/features/route/schemas/route.schema';
import TimePickerSheet from '@/features/route/components/TimePickerSheet';
import type { TRouteInput } from '@/types';
import { useState } from 'react';

type Props = {
  onSubmit: (input: TRouteInput) => void;
  isLoading: boolean;
};

type TimeMode = 'now' | 'set';

export default function RouteInputForm({ onSubmit, isLoading }: Props) {
  const [hubId, setHubId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const [arrivalTime, setArrivalTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [hasLuggage, setHasLuggage] = useState<boolean | null>(null);
  const [preferLessWalking, setPreferLessWalking] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subDestinations = getSubDestinations(hubId);

  const handleHubChange = (id: string) => {
    setHubId(id);
    setDestinationId('');
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const result = RouteInputSchema.safeParse({
      hubId,
      destinationId,
      arrivalTime: timeMode === 'set' ? arrivalTime : '',
      hasLuggage: hasLuggage ?? false,
      preferLessWalking: preferLessWalking ?? false,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  const segClass = (active: boolean) =>
    [
      'flex-1 py-3 text-[14px] font-medium rounded-xl border transition active:scale-[0.97]',
      active
        ? 'bg-blue-500 border-blue-500 text-white active:bg-blue-700'
        : 'bg-white border-gray-200 text-gray-500 active:bg-gray-100',
    ].join(' ');

  const chipClass = (active: boolean) =>
    [
      'px-4 py-2.5 rounded-full text-[13px] font-medium border transition active:scale-[0.96]',
      active
        ? 'bg-blue-500 border-blue-500 text-white active:bg-blue-700'
        : 'bg-white border-gray-200 text-gray-500 active:bg-gray-100',
    ].join(' ');

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* 1. 도착 거점 */}
      <div className="space-y-2.5">
        <p className="text-[15px] font-semibold text-gray-800">서울 어디에 도착했나요?</p>
        <div className="flex gap-2">
          {HUBS.map((h) => (
            <button key={h.id} type="button" onClick={() => handleHubChange(h.id)} className={segClass(hubId === h.id)}>
              {h.name}
            </button>
          ))}
        </div>
        {errors.hubId && <p className="text-xs text-red-500">{errors.hubId}</p>}
      </div>

      {/* 2. 최종 목적지 */}
      {hubId && (
        <div className="space-y-2.5">
          <p className="text-[15px] font-semibold text-gray-800">어디로 이동하시나요?</p>
          <div className="flex flex-wrap gap-2">
            {subDestinations.map((d) => (
              <button key={d.id} type="button" onClick={() => setDestinationId(d.id)} className={chipClass(destinationId === d.id)}>
                {d.name}
              </button>
            ))}
          </div>
          {errors.destinationId && <p className="text-xs text-red-500">{errors.destinationId}</p>}
        </div>
      )}

      {/* 3. 짐 유무 */}
      <div className="space-y-2.5">
        <p className="text-[15px] font-semibold text-gray-800">짐이 있나요?</p>
        <div className="flex gap-2">
          {([true, false] as const).map((val) => (
            <button key={String(val)} type="button" onClick={() => setHasLuggage(val)} className={segClass(hasLuggage === val)}>
              {val ? '짐이 있어요' : '가볍게 왔어요'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 걷기 선호도 */}
      <div className="space-y-2.5">
        <p className="text-[15px] font-semibold text-gray-800">걷는 건 괜찮으신가요?</p>
        <div className="flex gap-2">
          {([false, true] as const).map((val) => (
            <button key={String(val)} type="button" onClick={() => setPreferLessWalking(val)} className={segClass(preferLessWalking === val)}>
              {val ? '적게 걷고 싶어요' : '걸어도 괜찮아요'}
            </button>
          ))}
        </div>
      </div>

      {/* 5. 도착 시간 (선택) */}
      <div className="space-y-2.5">
        <p className="text-[15px] font-semibold text-gray-800">
          시간 맞춰 이동할까요?{' '}
          <span className="text-[13px] font-normal text-gray-400">선택</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setTimeMode('now'); setArrivalTime(''); }}
            className={segClass(timeMode === 'now')}
          >
            지금 바로
          </button>
          <button
            type="button"
            onClick={() => setTimeMode('set')}
            className={segClass(timeMode === 'set')}
          >
            시간 맞추기
          </button>
        </div>

        {timeMode === 'set' && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 bg-white active:bg-gray-50 transition"
          >
            <span className="text-[13px] text-gray-500">도착 희망 시간</span>
            <span className={`text-[15px] font-semibold ${arrivalTime ? 'text-blue-500' : 'text-gray-400'}`}>
              {arrivalTime
                ? (() => {
                    const [h, m] = arrivalTime.split(':').map(Number);
                    const period = h < 12 ? '오전' : '오후';
                    const hour = h % 12 || 12;
                    return `${period} ${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  })()
                : '시간 선택'}
            </span>
          </button>
        )}
      </div>

      {showPicker && (
        <TimePickerSheet
          value={arrivalTime}
          onConfirm={(v) => setArrivalTime(v)}
          onClose={() => setShowPicker(false)}
        />
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 rounded-xl bg-blue-500 text-white font-semibold text-[15px]
                   transition active:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '추천 계산 중...' : '추천받기'}
      </button>
    </form>
  );
}

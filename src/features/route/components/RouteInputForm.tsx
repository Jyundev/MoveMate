'use client';

import { RouteInputSchema } from '@/features/route/schemas/route.schema';
import type { TRouteInput } from '@/types';
import { useState } from 'react';

type Props = {
  onSubmit: (input: TRouteInput) => void;
  isLoading: boolean;
};

export default function RouteInputForm({ onSubmit, isLoading }: Props) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [hasLuggage, setHasLuggage] = useState(false);
  const [preferLessWalking, setPreferLessWalking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = RouteInputSchema.safeParse({
      origin,
      destination,
      arrivalTime,
      hasLuggage,
      preferLessWalking,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 출발지 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">출발지</label>
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="출발지를 입력하세요"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.origin && <p className="mt-1 text-xs text-red-500">{errors.origin}</p>}
      </div>

      {/* 도착지 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">도착지</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="도착지를 입력하세요"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.destination && <p className="mt-1 text-xs text-red-500">{errors.destination}</p>}
      </div>

      {/* 도착 희망 시간 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">도착 희망 시간</label>
        <input
          type="time"
          value={arrivalTime}
          onChange={(e) => setArrivalTime(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.arrivalTime && <p className="mt-1 text-xs text-red-500">{errors.arrivalTime}</p>}
      </div>

      {/* 짐 유무 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">짐이 있나요?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: '있어요' },
            { value: false, label: '없어요' },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setHasLuggage(opt.value)}
              className={[
                'py-3 rounded-xl border text-sm font-medium transition',
                hasLuggage === opt.value
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 걷기 선호도 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">걷기는요?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: false, label: '괜찮아요' },
            { value: true, label: '최소화할게요' },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setPreferLessWalking(opt.value)}
              className={[
                'py-3 rounded-xl border text-sm font-medium transition',
                preferLessWalking === opt.value
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 rounded-xl bg-blue-500 text-white font-semibold text-[15px]
                   hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '경로 계산 중...' : '추천받기'}
      </button>
    </form>
  );
}

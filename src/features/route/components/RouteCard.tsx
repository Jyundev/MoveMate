'use client';

import type { TAvailability, TRouteOption, TTransportMode } from '@/types';

type Props = {
  route: TRouteOption;
  onClick: (route: TRouteOption) => void;
};

const MODE_ICON: Record<TTransportMode, string> = {
  WALK: '🚶',
  BIKE: '🚲',
  LOCKER_WALK: '🧳',
};

function AvailabilityBadge({ value }: { value: TAvailability }) {
  const map = {
    HIGH:   { label: '높음', className: 'bg-green-100 text-green-700' },
    MEDIUM: { label: '보통', className: 'bg-yellow-100 text-yellow-700' },
    LOW:    { label: '낮음', className: 'bg-red-100 text-red-600' },
  };
  const { label, className } = map[value];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function RouteCard({ route, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(route)}
      className="w-full text-left bg-white rounded-2xl border border-gray-100
                 shadow-sm p-5 space-y-4 hover:shadow-md transition"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{MODE_ICON[route.mode]}</span>
          <span className="text-[15px] font-semibold text-gray-800">{route.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <span>이용 가능성</span>
          <AvailabilityBadge value={route.stability} />
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px] text-gray-600">
          <span>⏱</span>
          <span>
            총 <strong>{route.totalMinutes}분</strong> · 도보 {route.walkMinutes}분
          </span>
        </div>

        {route.bike && (
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <span>🚲</span>
            <span>
              {route.bike.distanceM}m 내 자전거{' '}
              <strong>{route.bike.availableCount}대</strong> 가능
            </span>
            <AvailabilityBadge value={route.bike.availability} />
          </div>
        )}

        {route.locker && (
          <div className="flex items-center gap-2 text-[13px] text-gray-600">
            <span>🧳</span>
            <span>
              보관함 <strong>{route.locker.availableCount}칸</strong> 여유
            </span>
            <AvailabilityBadge value={route.locker.availability} />
          </div>
        )}
      </div>

      {/* 추천 이유 */}
      <div className="bg-blue-50 rounded-xl px-4 py-3">
        <p className="text-[12.5px] text-blue-700">⭐ {route.reason}</p>
      </div>
    </button>
  );
}

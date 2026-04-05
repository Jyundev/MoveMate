'use client';

import type { TRecommendResult, TRouteOption } from '@/types';
import {
  ArrowRight,
  Bike,
  CheckCircle,
  Footprints,
  Map,
  Package,
  X,
} from 'lucide-react';
import RouteCard from './RouteCard';

type Props = {
  route: TRouteOption;
  result: TRecommendResult;
  rank: number;
  onClose: () => void;
  onShowMap: () => void;
};

type Step = {
  icon: React.ReactNode;
  label: string;
  sub?: string;
};

function buildSteps(route: TRouteOption, result: TRecommendResult): Step[] {
  const hub = result.hubName;
  const dest = result.destinationName;

  if (route.mode === 'WALK') {
    return [
      {
        icon: <Footprints size={16} className="text-blue-500" />,
        label: `${hub}에서 출발`,
        sub: '거점 도착 후 바로 이동',
      },
      {
        icon: <ArrowRight size={16} className="text-gray-400" />,
        label: `${dest}까지 도보 이동`,
        sub: `약 ${route.walkMinutes}분 소요`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `예상 도착 ${route.arrivalTime}`,
      },
    ];
  }

  if (route.mode === 'BIKE' && route.bike) {
    const rideMin = route.totalMinutes - route.walkMinutes;
    return [
      {
        icon: <Footprints size={16} className="text-blue-500" />,
        label: `${hub}에서 출발`,
        sub: '거점 도착 후 자전거 대여소로 이동',
      },
      {
        icon: <Bike size={16} className="text-blue-500" />,
        label: `${route.bike.stationName} 자전거 대여`,
        sub: `거점에서 ${route.bike.distanceM}m · 잔여 ${route.bike.availableCount}대`,
      },
      {
        icon: <ArrowRight size={16} className="text-gray-400" />,
        label: `자전거로 ${dest}까지 이동`,
        sub: `약 ${rideMin > 0 ? rideMin : route.totalMinutes}분 소요`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `예상 도착 ${route.arrivalTime}`,
      },
    ];
  }

  if (route.mode === 'LOCKER_WALK' && route.locker) {
    return [
      {
        icon: <Package size={16} className="text-blue-500" />,
        label: `${hub}에서 짐 보관`,
        sub: `${route.locker.name} · 여유 ${route.locker.availableCount}칸`,
      },
      {
        icon: <Footprints size={16} className="text-gray-400" />,
        label: `가볍게 ${dest}까지 도보`,
        sub: `약 ${route.walkMinutes}분 소요`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `예상 도착 ${route.arrivalTime}`,
      },
    ];
  }

  return [];
}

export default function RouteDetailSheet({
  route,
  result,
  rank,
  onClose,
  onShowMap,
}: Props) {
  const steps = buildSteps(route, result);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end z-50"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="sticky top-0 bg-white pt-4 pb-2 px-6 border-b border-gray-100 z-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-gray-900">
              {route.label} 상세
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* 루트 카드 요약 */}
          <RouteCard route={route} rank={rank} onClick={() => {}} />

          {/* 이동 단계 */}
          {steps.length > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                이동 단계
              </h3>
              <div className="relative">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {/* 연결선 */}
                    {i < steps.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200" />
                    )}
                    <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center shrink-0 border border-gray-100 z-10">
                      {step.icon}
                    </div>
                    <div className="pb-5">
                      <p className="text-[14px] font-medium text-gray-900">
                        {step.label}
                      </p>
                      {step.sub && (
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {step.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 실시간 인프라 정보 */}
          {(route.bike || route.locker) && (
            <section>
              <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                실시간 현황
              </h3>
              <div className="space-y-3">
                {route.bike && (
                  <InfraCard
                    icon={<Bike size={18} className="text-blue-500" />}
                    bg="bg-blue-50"
                    title={route.bike.stationName}
                    badge={
                      route.bike.availability === 'HIGH'
                        ? '여유'
                        : route.bike.availability === 'MEDIUM'
                          ? '보통'
                          : '부족'
                    }
                    badgeColor={
                      route.bike.availability === 'HIGH'
                        ? 'text-green-600 bg-green-100'
                        : route.bike.availability === 'MEDIUM'
                          ? 'text-yellow-600 bg-yellow-100'
                          : 'text-red-600 bg-red-100'
                    }
                    items={[
                      `거점에서 ${route.bike.distanceM}m`,
                      `잔여 자전거 ${route.bike.availableCount}대`,
                    ]}
                  />
                )}
                {route.locker && (
                  <InfraCard
                    icon={<Package size={18} className="text-purple-500" />}
                    bg="bg-purple-50"
                    title={route.locker.name}
                    badge={
                      route.locker.availability === 'HIGH'
                        ? '여유'
                        : route.locker.availability === 'MEDIUM'
                          ? '보통'
                          : '부족'
                    }
                    badgeColor={
                      route.locker.availability === 'HIGH'
                        ? 'text-green-600 bg-green-100'
                        : route.locker.availability === 'MEDIUM'
                          ? 'text-yellow-600 bg-yellow-100'
                          : 'text-red-600 bg-red-100'
                    }
                    items={[`사용 가능 ${route.locker.availableCount}칸`]}
                  />
                )}
              </div>
            </section>
          )}

          {/* 왜 추천하나요 */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
              왜 추천하나요?
            </h3>
            <div className="bg-blue-50 rounded-2xl px-4 py-4">
              <p className="text-[13px] text-blue-800 leading-relaxed">
                ⭐ {route.reason}
              </p>
              <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-3 gap-2 text-center">
                <StatItem label="총 소요" value={`${route.totalMinutes}분`} />
                <StatItem label="도보" value={`${route.walkMinutes}분`} />
                <StatItem label="도착" value={route.arrivalTime} />
              </div>
            </div>
          </section>

          {/* 액션 버튼 */}
          <div className="space-y-2 pb-4">
            <button
              onClick={onShowMap}
              className="w-full py-4 rounded-xl bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
            >
              <Map size={16} />
              지도에서 위치 확인
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfraCard({
  icon,
  bg,
  title,
  badge,
  badgeColor,
  items,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  badge: string;
  badgeColor: string;
  items: string[];
}) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 truncate">
            {title}
          </p>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-12">
        {items.map((item, i) => (
          <span key={i} className="text-[12px] text-gray-500">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-blue-500">{label}</p>
      <p className="text-[15px] font-bold text-blue-900">{value}</p>
    </div>
  );
}

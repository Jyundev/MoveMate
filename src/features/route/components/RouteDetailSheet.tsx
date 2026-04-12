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
  onShowMap: (route: TRouteOption) => void;
};

type Step = {
  icon: React.ReactNode;
  label: string;
  sub?: string;
};

function getDetailFailRiskReason(route: TRouteOption): string | null {
  if (route.failRisk === 'LOW' || route.mode === 'WALK') return null;
  if (route.mode === 'BIKE') {
    return route.failRisk === 'HIGH'
      ? '자전거 수가 부족해 현장에서 대여 불가 가능성이 있습니다'
      : '자전거 수가 적어 도착 전 대여 완료될 수 있습니다';
  }
  if (route.mode === 'LOCKER_WALK') {
    return route.failRisk === 'HIGH'
      ? '보관함 여석이 부족해 이용 불가 가능성이 있습니다'
      : '보관함 여석이 적어 도착 전 마감될 수 있습니다';
  }
  if (route.mode === 'LOCKER_BIKE') {
    return route.failRisk === 'HIGH'
      ? '자전거 또는 보관함 중 하나라도 이용 불가일 경우 전략 전체가 실패할 수 있습니다'
      : '자전거·보관함 모두 여유가 필요하므로 둘 중 하나가 부족하면 대안이 필요합니다';
  }
  return null;
}

function buildSteps(route: TRouteOption, result: TRecommendResult): Step[] {
  const hub = result.hubName;
  const dest = result.destinationName;

  if (route.mode === 'WALK') {
    return [
      {
        icon: <Footprints size={16} className="text-blue-500" />,
        label: `${hub}에서 출발`,
        sub: '별도 이동수단 없이 바로 이동 · 가장 단순한 방법',
      },
      {
        icon: <ArrowRight size={16} className="text-gray-400" />,
        label: `${dest}까지 도보 이동`,
        sub: `약 ${route.walkMinutes}분 소요 · 짐 없이 이동 가능한 거리`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `목표 도착 ${route.targetArrivalTime}`,
      },
    ];
  }

  if (route.mode === 'BIKE' && route.bike) {
    const rideMin = route.totalMinutes - route.walkMinutes;
    return [
      {
        icon: <Footprints size={16} className="text-blue-500" />,
        label: `${hub}에서 출발`,
        sub: '대여소까지 짧게 이동 · 이동 시간 단축 목적',
      },
      {
        icon: <Bike size={16} className="text-blue-500" />,
        label: `${route.bike.stationName} 자전거 대여`,
        sub: `거점에서 ${route.bike.distanceM}m · 잔여 ${route.bike.availableCount}대 확인됨`,
      },
      {
        icon: <ArrowRight size={16} className="text-gray-400" />,
        label: `자전거로 ${dest}까지 이동`,
        sub: `약 ${rideMin > 0 ? rideMin : route.totalMinutes}분 소요 · 도보 대비 빠른 이동`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `목표 도착 ${route.targetArrivalTime}`,
      },
    ];
  }

  if (route.mode === 'LOCKER_WALK' && route.locker) {
    if (route.lockerLocation === 'destination') {
      return [
        {
          icon: <Footprints size={16} className="text-blue-500" />,
          label: `${hub}에서 출발`,
          sub: '짐을 들고 목적지로 이동 · 보관 전 이동 부담 감수',
        },
        {
          icon: <Package size={16} className="text-purple-500" />,
          label: `${dest} 도착 후 짐 보관`,
          sub: `${route.locker.name} · 여유 ${route.locker.availableCount}칸 · 도착 후 바로 보관`,
        },
        {
          icon: <CheckCircle size={16} className="text-green-500" />,
          label: `${dest} 자유 탐방`,
          sub: `목표 도착 ${route.targetArrivalTime} · 짐 없이 활동 가능`,
        },
      ];
    }
    // hub variant (기본)
    return [
      {
        icon: <Package size={16} className="text-blue-500" />,
        label: `${hub}에서 짐 보관`,
        sub: `${route.locker.name} · 여유 ${route.locker.availableCount}칸 · 이동 전 짐 해소`,
      },
      {
        icon: <Footprints size={16} className="text-gray-400" />,
        label: `가볍게 ${dest}까지 도보`,
        sub: `약 ${route.walkMinutes}분 소요 · 짐 없이 편하게 이동`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `목표 도착 ${route.targetArrivalTime}`,
      },
    ];
  }

  if (route.mode === 'LOCKER_BIKE' && route.locker && route.bike) {
    const rideMin = route.totalMinutes - route.walkMinutes - 5; // 총 - 도보 - 보관 5분
    return [
      {
        icon: <Package size={16} className="text-orange-500" />,
        label: `${hub}에서 짐 보관`,
        sub: `${route.locker.name} · 여유 ${route.locker.availableCount}칸 · 자전거 이동 전 필수 처리`,
      },
      {
        icon: <Bike size={16} className="text-orange-500" />,
        label: `${route.bike.stationName} 자전거 대여`,
        sub: `거점에서 ${route.bike.distanceM}m · 잔여 ${route.bike.availableCount}대 확인됨`,
      },
      {
        icon: <ArrowRight size={16} className="text-gray-400" />,
        label: `자전거로 ${dest}까지 이동`,
        sub: `약 ${rideMin > 0 ? rideMin : route.totalMinutes}분 소요 · 짐 없이 빠르게 이동`,
      },
      {
        icon: <CheckCircle size={16} className="text-green-500" />,
        label: `${dest} 도착`,
        sub: `목표 도착 ${route.targetArrivalTime}`,
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
        className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto scrollbar-hide"
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
          <RouteCard route={route} rank={rank} onClick={onShowMap} hideCta hideReason />

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

          {/* 선택 근거 */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
              선택 근거
            </h3>
            <div className="bg-blue-50 rounded-2xl px-4 py-4">
              <p className="text-[13px] text-blue-800 leading-relaxed">
                {route.reason}
              </p>
              <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-3 gap-2 text-center">
                <StatItem label="예상 출발" value={route.estimatedDepartureTime} />
                <StatItem label="총 소요 *" value={`${route.totalMinutes}분`} />
                <StatItem label="목표 도착" value={route.targetArrivalTime} />
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-2 gap-2">
                <RiskItem
                  label="실행 가능성"
                  value={{ HIGH: '지금 바로 가능', MEDIUM: '여유 적음', LOW: '어려울 수 있음' }[route.stability]}
                  color={{ HIGH: 'text-green-600', MEDIUM: 'text-yellow-600', LOW: 'text-red-500' }[route.stability]}
                  desc={getStabilityDesc(route)}
                />
                <RiskItem
                  label="실패 위험도"
                  value={{ LOW: '문제 없음', MEDIUM: '변수 있음', HIGH: '주의 필요' }[route.failRisk]}
                  color={{ LOW: 'text-green-600', MEDIUM: 'text-yellow-600', HIGH: 'text-red-500' }[route.failRisk]}
                  desc={getFailRiskDesc(route)}
                />
              </div>
              {getDetailFailRiskReason(route) && (
                <p className="text-[11px] text-blue-500/80 mt-2 leading-[1.5]">
                  ⚠ {getDetailFailRiskReason(route)}
                </p>
              )}
              <p className="text-[10px] text-blue-400 mt-2">
                * 실시간 데이터 + 추정 이동시간 기반 (도보 67m/분, 자전거 200m/분, 보정계수 1.3 적용)
              </p>
            </div>
          </section>

          {/* 액션 버튼 */}
          <div className="space-y-2 pb-4">
            <button
              onClick={() => onShowMap(route)}
              className="w-full py-4 rounded-xl bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
            >
              <Map size={16} />
              지도에서 경로 보기
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

function RiskItem({ label, value, color, desc }: { label: string; value: string; color: string; desc?: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-blue-500">{label}</p>
      <p className={`text-[14px] font-bold mt-0.5 ${color}`}>{value}</p>
      {desc && <p className="text-[10px] text-blue-400 mt-0.5 leading-snug">{desc}</p>}
    </div>
  );
}

function getStabilityDesc(route: TRouteOption): string {
  if (route.mode === 'WALK') return '인프라 없이 바로 이동';
  if (route.mode === 'BIKE') {
    const count = route.bike?.availableCount ?? 0;
    return `현재 자전거 ${count}대 확인`;
  }
  if (route.mode === 'LOCKER_WALK' || route.mode === 'LOCKER_BIKE') {
    const count = route.locker?.availableCount ?? 0;
    return `보관함 여유 ${count}칸 확인`;
  }
  return '';
}

function getFailRiskDesc(route: TRouteOption): string {
  if (route.mode === 'WALK') return '외부 변수 없음';
  if (route.mode === 'BIKE') return '대여소 혼잡도 기준';
  if (route.mode === 'LOCKER_WALK') return '보관함 여석 기준';
  if (route.mode === 'LOCKER_BIKE') return '자전거 + 보관함 복합 기준';
  return '';
}

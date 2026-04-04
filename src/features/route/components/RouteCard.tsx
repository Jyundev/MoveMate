"use client";

import type { TAvailability, TRouteOption, TTransportMode } from "@/types";
import { Bike, Footprints, Package } from "lucide-react";

type Props = {
  route: TRouteOption;
  rank: number; // 1 = 1순위
  onClick: (route: TRouteOption) => void;
};

const MODE_ICON: Record<TTransportMode, React.ReactNode> = {
  WALK: <Footprints size={20} />,
  BIKE: <Bike size={20} />,
  LOCKER_WALK: <Package size={20} />,
};

const RECOMMENDATION_LABEL: Record<
  TAvailability,
  { label: string; className: string }
> = {
  HIGH: { label: "추천도 높음", className: "bg-green-100 text-green-700" },
  MEDIUM: { label: "추천도 보통", className: "bg-yellow-100 text-yellow-700" },
  LOW: { label: "추천도 낮음", className: "bg-red-100 text-red-600" },
};

export default function RouteCard({ route, rank, onClick }: Props) {
  const isTop = rank === 1;
  const rec = RECOMMENDATION_LABEL[route.stability];

  return (
    <button
      onClick={() => onClick(route)}
      className={[
        "w-full text-left rounded-2xl border p-5 space-y-4 transition",
        isTop
          ? "bg-blue-50 border-blue-200 shadow-sm hover:shadow-md"
          : "bg-white border-gray-100 shadow-sm hover:shadow-md",
      ].join(" ")}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* 순위 배지 */}
          {isTop ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              ✦ 가장 추천
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 font-medium px-1">
              {rank}순위
            </span>
          )}
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rec.className}`}
        >
          {rec.label}
        </span>
      </div>

      {/* 이동 수단 + 시간 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <span className={isTop ? "text-blue-500" : "text-gray-500"}>
            {MODE_ICON[route.mode]}
          </span>
          <span className="text-[16px] font-bold">{route.label}</span>
        </div>
        <div className="text-right">
          <span className="text-[22px] font-extrabold text-gray-900 tabular-nums">
            {route.totalMinutes}
          </span>
          <span className="text-[13px] text-gray-500 ml-0.5">분</span>
          <p className="text-[11px] text-gray-400 mt-0.5">
            도보 {route.walkMinutes}분 포함
          </p>
        </div>
      </div>

      {/* 실시간 정보 */}
      {(route.bike || route.locker) && (
        <div className="space-y-1.5">
          {route.bike && (
            <div className="flex items-center gap-2 text-[12px] text-gray-600">
              <Bike size={13} className="text-gray-400 shrink-0" />
              <span>
                <strong>{route.bike.distanceM}m</strong> 내 대여소 · 자전거{" "}
                <strong>{route.bike.availableCount}대</strong>
              </span>
              <AvailabilityDot value={route.bike.availability} />
            </div>
          )}
          {route.locker && (
            <div className="flex items-center gap-2 text-[12px] text-gray-600">
              <Package size={13} className="text-gray-400 shrink-0" />
              <span>
                보관함 <strong>{route.locker.availableCount}칸</strong> 여유
              </span>
              <AvailabilityDot value={route.locker.availability} />
            </div>
          )}
        </div>
      )}

      {/* 추천 이유 */}
      <div
        className={`rounded-xl px-4 py-3 ${
          isTop ? "bg-blue-100/60" : "bg-gray-50"
        }`}
      >
        <p
          className={`text-[12px] leading-[1.6] ${
            isTop ? "text-blue-700" : "text-gray-600"
          }`}
        >
          ⭐ {route.reason}
        </p>
      </div>

      {/* CTA */}
      {/* <div className={`flex items-center justify-between pt-0.5 ${isTop ? 'text-blue-500' : 'text-gray-400'}`}>
        <span className="text-[12px] font-semibold">
          {isTop ? '이 방법으로 이동하기' : '자세히 보기'}
        </span>
        <ChevronRight size={14} />
      </div> */}
    </button>
  );
}

function AvailabilityDot({ value }: { value: TAvailability }) {
  const color = {
    HIGH: "bg-green-400",
    MEDIUM: "bg-yellow-400",
    LOW: "bg-red-400",
  }[value];
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />;
}

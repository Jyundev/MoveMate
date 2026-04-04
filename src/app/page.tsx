'use client';

import RouteCard from '@/features/route/components/RouteCard';
import RouteInputForm from '@/features/route/components/RouteInputForm';
import { useRouteRecommend } from '@/features/route/hooks/useRouteRecommend';
import type { TRouteInput, TRouteOption } from '@/types';
import { useState } from 'react';

export default function HomePage() {
  const [input, setInput] = useState<TRouteInput | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TRouteOption | null>(null);

  const { data, isFetching, isError, error } = useRouteRecommend(input);

  const handleSubmit = (formInput: TRouteInput) => {
    setSelectedRoute(null);
    setInput(formInput);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[480px] px-5 pb-16">
        {/* 헤더 */}
        <header className="pt-10 pb-6">
          <h1 className="text-[24px] font-bold text-gray-900">MoveMate</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            서울 도착 후, 가장 덜 불편한 이동을 추천해드릴게요
          </p>
        </header>

        {/* 입력 폼 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <RouteInputForm onSubmit={handleSubmit} isLoading={isFetching} />
        </section>

        {/* 에러 */}
        {isError && (
          <div className="mt-4 p-4 bg-red-50 rounded-xl text-sm text-red-600">
            {error?.message ?? '경로를 불러오지 못했습니다.'}
          </div>
        )}

        {/* 로딩 */}
        {isFetching && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* 결과 */}
        {data && !isFetching && (
          <section className="mt-6 space-y-3">
            <p className="text-[13px] text-gray-500">
              <strong className="text-gray-800">{data.hubName}</strong>
              {' → '}
              <strong className="text-gray-800">{data.destinationName}</strong>
              {' · '}추천 {data.routes.length}가지
            </p>
            {data.routes.map((route) => (
              <RouteCard key={route.id} route={route} onClick={setSelectedRoute} />
            ))}
          </section>
        )}

        {/* 상세 바텀시트 */}
        {selectedRoute && (
          <div
            className="fixed inset-0 bg-black/40 flex items-end z-50"
            onClick={() => setSelectedRoute(null)}
          >
            <div
              className="w-full bg-white rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
              <h2 className="text-[17px] font-semibold">{selectedRoute.label} 상세</h2>
              <RouteCard route={selectedRoute} onClick={() => {}} />

              {/* 추가 상세 정보 */}
              <div className="space-y-3 pt-2">
                {selectedRoute.bike && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                    <p className="text-[13px] font-semibold text-gray-700">🚲 자전거 대여소</p>
                    <p className="text-[13px] text-gray-600">{selectedRoute.bike.stationName}</p>
                    <p className="text-[12px] text-gray-500">
                      거점에서 {selectedRoute.bike.distanceM}m · 잔여 {selectedRoute.bike.availableCount}대
                    </p>
                  </div>
                )}
                {selectedRoute.locker && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                    <p className="text-[13px] font-semibold text-gray-700">🧳 물품보관함</p>
                    <p className="text-[13px] text-gray-600">{selectedRoute.locker.name}</p>
                    <p className="text-[12px] text-gray-500">
                      사용 가능 {selectedRoute.locker.availableCount}칸
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedRoute(null)}
                className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

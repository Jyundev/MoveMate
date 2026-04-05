'use client';

import OnboardingScreen from '@/features/onboarding/components/OnboardingScreen';
import RouteCard from '@/features/route/components/RouteCard';
import RouteDetailSheet from '@/features/route/components/RouteDetailSheet';
import RouteInputForm from '@/features/route/components/RouteInputForm';
import { useRouteRecommend } from '@/features/route/hooks/useRouteRecommend';
import type { TRouteInput, TRouteOption } from '@/types';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// SSR 비활성화 (Leaflet은 브라우저 전용)
const MapView = dynamic(
  () => import('@/features/route/components/MapView'),
  { ssr: false }
);

type View = 'onboarding' | 'main' | 'map';

export default function HomePage() {
  const [view, setView] = useState<View>('onboarding');
  const [input, setInput] = useState<TRouteInput | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TRouteOption | null>(null);

  const { data, isFetching, isError, error } = useRouteRecommend(input);

  const handleSubmit = (formInput: TRouteInput) => {
    setSelectedRoute(null);
    setInput(formInput);
  };

  const handleShowMap = () => {
    setView('map');
  };

  const handleBackFromMap = () => {
    setView('main');
  };

  // 온보딩
  if (view === 'onboarding') {
    return <OnboardingScreen onStart={() => setView('main')} />;
  }

  // 지도 화면
  if (view === 'map' && selectedRoute && input && data) {
    return (
      <MapView
        input={input}
        route={selectedRoute}
        hubName={data.hubName}
        destinationName={data.destinationName}
        onBack={handleBackFromMap}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[480px] px-5 pb-16">
        {/* 헤더 */}
        <header className="pt-10 pb-6">
          <button
            onClick={() => setView('onboarding')}
            className="text-[24px] font-bold text-gray-900 hover:text-blue-500 transition-colors"
          >
            MoveMate
          </button>
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
            {data.routes.map((route, idx) => (
              <RouteCard
                key={route.id}
                route={route}
                rank={idx + 1}
                onClick={setSelectedRoute}
              />
            ))}
          </section>
        )}
      </div>

      {/* 상세 바텀시트 */}
      {selectedRoute && data && (
        <RouteDetailSheet
          route={selectedRoute}
          result={data}
          rank={(data.routes.findIndex((r) => r.id === selectedRoute.id)) + 1}
          onClose={() => setSelectedRoute(null)}
          onShowMap={handleShowMap}
        />
      )}
    </main>
  );
}

'use client';

import OnboardingScreen from '@/features/onboarding/components/OnboardingScreen';
import RouteCard from '@/features/route/components/RouteCard';
import RouteDetailSheet from '@/features/route/components/RouteDetailSheet';
import RouteInputForm from '@/features/route/components/RouteInputForm';
import { useRouteRecommend } from '@/features/route/hooks/useRouteRecommend';
import type { TRouteInput, TRouteOption } from '@/types';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const MapView = dynamic(
  () => import('@/features/route/components/MapView'),
  { ssr: false }
);

type View = 'onboarding' | 'input' | 'result' | 'map';

export default function HomePage() {
  const [view, setView] = useState<View>('onboarding');
  const [input, setInput] = useState<TRouteInput | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TRouteOption | null>(null);

  const { data, isFetching, isError, error } = useRouteRecommend(input);

  const handleSubmit = (formInput: TRouteInput) => {
    setSelectedRoute(null);
    setInput(formInput);
    setView('result');
  };

  if (view === 'onboarding') {
    return <OnboardingScreen onStart={() => setView('input')} />;
  }

  if (view === 'map' && selectedRoute && input && data) {
    return (
      <MapView
        input={input}
        route={selectedRoute}
        hubName={data.hubName}
        destinationName={data.destinationName}
        onBack={() => setView('result')}
      />
    );
  }

  // ── 입력 화면 ────────────────────────────────────────────────────
  if (view === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="mx-auto w-full max-w-[480px] flex flex-col min-h-screen">
          {/* 헤더 */}
          <header className="sticky top-0 z-10 bg-gray-50 px-5 pt-12 pb-4">
            <button
              onClick={() => setView('onboarding')}
              className="mb-4 flex items-center gap-1.5 text-gray-400 active:text-gray-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-[13px]">홈으로</span>
            </button>
            <h1 className="text-[22px] font-bold text-gray-900">이동 정보 입력</h1>
            <p className="mt-1 text-[13px] text-gray-400">
              입력하신 조건에 맞는 경로를 추천해드려요
            </p>
          </header>

          {/* 폼 */}
          <div className="flex-1 px-5 pb-10">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <RouteInputForm onSubmit={handleSubmit} isLoading={isFetching} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="mx-auto w-full max-w-[480px] flex flex-col min-h-screen">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 bg-gray-50 px-5 pt-12 pb-4 border-b border-gray-100">
          <button
            onClick={() => setView('input')}
            className="mb-3 flex items-center gap-1.5 text-gray-400 active:text-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-[13px]">다시 검색</span>
          </button>
          {data && !isFetching ? (
            <>
              <h1 className="text-[20px] font-bold text-gray-900">
                {data.hubName} → {data.destinationName}
              </h1>
              <p className="mt-0.5 text-[13px] text-gray-400">
                추천 경로 {data.routes.length}가지
              </p>
            </>
          ) : (
            <>
              <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded-lg animate-pulse mt-1.5" />
            </>
          )}
        </header>

        {/* 콘텐츠 */}
        <div className="flex-1 px-5 py-5 pb-10 space-y-3">
          {/* 에러 */}
          {isError && (
            <div className="p-4 bg-red-50 rounded-2xl text-[13px] text-red-600 text-center">
              {error?.message ?? '경로를 불러오지 못했습니다.'}
              <button
                onClick={() => setView('input')}
                className="block mx-auto mt-2 text-red-500 font-semibold underline"
              >
                다시 시도하기
              </button>
            </div>
          )}

          {/* 로딩 스켈레톤 */}
          {isFetching &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
            ))}

          {/* 결과 카드 */}
          {data &&
            !isFetching &&
            data.routes.map((route, idx) => (
              <RouteCard
                key={route.id}
                route={route}
                rank={idx + 1}
                onClick={setSelectedRoute}
              />
            ))}
        </div>
      </div>

      {/* 상세 바텀시트 */}
      {selectedRoute && data && (
        <RouteDetailSheet
          route={selectedRoute}
          result={data}
          rank={data.routes.findIndex((r) => r.id === selectedRoute.id) + 1}
          onClose={() => setSelectedRoute(null)}
          onShowMap={() => setView('map')}
        />
      )}
    </div>
  );
}

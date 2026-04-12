'use client';

import OnboardingScreen from '@/features/onboarding/components/OnboardingScreen';
import LoadingScreen from '@/features/route/components/LoadingScreen';
import RouteCard from '@/features/route/components/RouteCard';
import RouteDetailSheet from '@/features/route/components/RouteDetailSheet';
import RouteInputForm from '@/features/route/components/RouteInputForm';
import { useRouteRecommend } from '@/features/route/hooks/useRouteRecommend';
import type { TRouteInput, TRouteOption } from '@/types';
import { AlertTriangle, ArrowLeft, Bike, Briefcase, Clock, Footprints, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import { startTransition, useCallback, useEffect, useState } from 'react';

const MapView = dynamic(
  () => import('@/features/route/components/MapView'),
  { ssr: false }
);

type View = 'onboarding' | 'input' | 'result' | 'map';

export default function HomePage() {
  const [view, setView] = useState<View>('onboarding');
  const [input, setInput] = useState<TRouteInput | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TRouteOption | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const { data, isFetching, isError, error } = useRouteRecommend(input);

  // 데이터 또는 에러 도착 시 dataReady 설정
  useEffect(() => {
    if (!isFetching && isAnalyzing && (data || isError)) {
      startTransition(() => setDataReady(true));
    }
  }, [isFetching, isAnalyzing, data, isError]);

  const handleTransition = useCallback(() => {
    setIsAnalyzing(false);
    setDataReady(false);
  }, []);

  const handleSubmit = (formInput: TRouteInput) => {
    setSelectedRoute(null);
    setInput(formInput);
    setIsAnalyzing(true);
    setDataReady(false);
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
            <h1 className="text-[22px] font-bold text-gray-900">지금 상황을 알려주세요</h1>
            <p className="mt-1 text-[13px] text-gray-400">
              조건에 맞는 최적 이동 전략을 분석해드릴게요
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

  // ── 의사결정 로딩 화면 ───────────────────────────────────────────
  if (view === 'result' && isAnalyzing && input) {
    return (
      <LoadingScreen
        input={input}
        isReady={dataReady}
        onTransition={handleTransition}
      />
    );
  }

  // ── 결과 화면 ─────────────────────────────��──────────────────────
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
                추천 경로 {Math.min(data.routes.length, 3)}가지
              </p>
              {input && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {input.hasLuggage && (
                    <span className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-medium">
                      <Briefcase size={11} /> 짐 있음
                    </span>
                  )}
                  {input.preferLessWalking && (
                    <span className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 font-medium">
                      <Footprints size={11} /> 도보 최소화
                    </span>
                  )}
                  {data.targetArrivalTime && (
                    <span className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
                      <Clock size={11} /> {data.targetArrivalTime} 도착 목표
                    </span>
                  )}
                </div>
              )}
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

          {/* 실시간 데이터 일부 불안정 배너 */}
          {data && !isFetching && (!data.dataStatus.bikeApiOk || !data.dataStatus.lockerApiOk) && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-amber-700">
                  일부 전략은 현재 사용할 수 없습니다
                </p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  실시간 데이터 일시 불안정 · 사용 가능한 최적 전략을 우선 추천합니다
                </p>
              </div>
            </div>
          )}

          {/* 결과 카드 (상위 3개만 노출) */}
          {data &&
            !isFetching &&
            data.routes.slice(0, 3).map((route, idx) => (
              <RouteCard
                key={route.id}
                route={route}
                rank={idx + 1}
                onClick={setSelectedRoute}
              />
            ))}

          {/* 데이터 조회 실패 전략 안내 */}
          {data && !isFetching && (
            <>
              {!data.dataStatus.bikeApiOk && (
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 opacity-60">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Bike size={15} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-500">자전거 전략</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">현재 이용 가능 여부 확인 불가 · 데이터 일시 불안정</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    제외됨
                  </span>
                </div>
              )}
              {!data.dataStatus.lockerApiOk && (
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 opacity-60">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Package size={15} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-500">보관함 전략</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">현재 이용 가능 여부 확인 불가 · 데이터 일시 불안정</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    제외됨
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 상세 바텀시트 */}
      {selectedRoute && data && (
        <RouteDetailSheet
          route={selectedRoute}
          result={data}
          rank={data.routes.findIndex((r) => r.id === selectedRoute.id) + 1}
          onClose={() => setSelectedRoute(null)}
          onShowMap={(r) => { setSelectedRoute(r); setView('map'); }}
        />
      )}
    </div>
  );
}

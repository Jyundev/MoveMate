'use client';

import type { TRouteInput } from '@/types';
import { BarChart3, Briefcase, Check, Footprints, MapPin, Wifi } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { icon: <Wifi size={16} />, message: '공영자전거 실시간 정보 확인 중...' },
  { icon: <Briefcase size={16} />, message: '주변 보관함 여석 확인 중...' },
  { icon: <MapPin size={16} />, message: '이동 거리 및 시간 계산 중...' },
  { icon: <BarChart3 size={16} />, message: '가장 적합한 이동 전략 분석 중...' },
];

function getContextMessage(input: TRouteInput): React.ReactNode | null {
  if (input.hasLuggage && input.preferLessWalking)
    return (
      <span className="flex items-center justify-center gap-1.5">
        <Briefcase size={13} /> 짐이 있고 도보를 최소화하는 전략을 찾고 있어요
      </span>
    );
  if (input.hasLuggage)
    return (
      <span className="flex items-center justify-center gap-1.5">
        <Briefcase size={13} /> 짐이 있는 이동 상황을 반영하고 있어요
      </span>
    );
  if (input.preferLessWalking)
    return (
      <span className="flex items-center justify-center gap-1.5">
        <Footprints size={13} /> 도보 부담을 최소화하는 전략을 찾고 있어요
      </span>
    );
  return null;
}

type Props = {
  input: TRouteInput;
  isReady: boolean;
  onTransition: () => void;
};

export default function LoadingScreen({ input, isReady, onTransition }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  // ref로 중복 실행 방지 — isDone을 effect 의존성에 넣으면
  // setIsDone(true) 직후 리렌더로 cleanup이 timer를 취소하는 버그 발생
  const transitionTriggered = useRef(false);

  const contextMsg = getContextMessage(input);
  const lastStep = STEPS.length - 1;

  // 단계 진행
  useEffect(() => {
    if (transitionTriggered.current || stepIndex >= lastStep) return;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), 450);
    return () => clearTimeout(timer);
  }, [stepIndex, lastStep]);

  // 마지막 단계 완료 + 데이터 준비 → "찾았습니다" → 화면 전환
  useEffect(() => {
    if (stepIndex === lastStep && isReady && !transitionTriggered.current) {
      transitionTriggered.current = true;
      setIsDone(true);
      const timer = setTimeout(onTransition, 700);
      return () => clearTimeout(timer);
    }
  }, [stepIndex, isReady, lastStep, onTransition]);

  const progress = isDone ? 100 : ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[360px] space-y-7">
        {/* 타이틀 */}
        <div className="text-center space-y-1.5">
          <p className="text-[12px] text-blue-500 font-bold uppercase tracking-widest">
            분석 중
          </p>
          <h2 className="text-[21px] font-bold text-gray-900 leading-snug">
            {isDone ? (
              <span className="text-blue-600 flex items-center justify-center gap-2">
                최적의 이동 전략을 찾았습니다
                <Check size={20} className="text-blue-600" strokeWidth={3} />
              </span>
            ) : (
              <>지금 상황에 맞는<br />이동 전략을 찾고 있어요</>
            )}
          </h2>
        </div>

        {/* 사용자 상황 반영 메시지 */}
        {contextMsg && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[13px] text-blue-700 font-medium text-center">
            {contextMsg}
          </div>
        )}

        {/* 단계별 메시지 */}
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const isActive = i === stepIndex && !isDone;
            const isCompleted = i < stepIndex || isDone;
            return (
              <div
                key={i}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                  isActive ? 'bg-blue-50' : '',
                ].join(' ')}
              >
                <span className={`transition-opacity duration-300 ${isCompleted || isActive ? 'opacity-100' : 'opacity-30'} ${isActive ? 'text-blue-500' : isCompleted ? 'text-gray-400' : 'text-gray-300'}`}>
                  {step.icon}
                </span>
                <span
                  className={[
                    'text-[13px] transition-all duration-300 flex-1',
                    isActive ? 'font-semibold text-blue-700' : '',
                    isCompleted ? 'text-gray-400' : '',
                    !isActive && !isCompleted ? 'text-gray-300' : '',
                  ].join(' ')}
                >
                  {step.message}
                </span>
                <span className="w-5 flex items-center justify-center shrink-0">
                  {isCompleted && (
                    <Check size={13} className="text-green-500" strokeWidth={3} />
                  )}
                  {isActive && (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* 진행 바 */}
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 text-right tabular-nums">{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
}

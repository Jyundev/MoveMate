"use client";

import { Bike, Footprints, MapPin, Zap } from "lucide-react";

type Props = {
  onStart: () => void;
};

export default function OnboardingScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="mx-auto max-w-[480px] w-full px-6 flex flex-col min-h-screen">
        {/* Hero */}
        <div className="pt-24 pb-10 flex flex-col items-center text-center">
          <div className="w-[72px] h-[72px] bg-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <MapPin size={36} className="text-white" />
          </div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">
            MoveMate
          </h1>
          <p className="mt-4 text-[16px] text-gray-500 leading-relaxed">
            서울 도착 후,
            <br />
            <span className="text-gray-800 font-medium">
              지금 상황에 맞는 이동 전략을 찾아드릴게요
            </span>
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-3 flex-1">
          <FeatureItem
            icon={<Bike size={22} className="text-blue-500" />}
            bg="bg-blue-50"
            title="실시간 자전거 현황 반영"
            description="근처 따릉이 대여소의 잔여 자전거 수를 실시간으로 확인해 추천해드려요."
          />
          <FeatureItem
            icon={<Zap size={22} className="text-yellow-500" />}
            bg="bg-yellow-50"
            title="물품보관함 즉시 확인"
            description="무거운 짐이 있다면 주변 보관함 여석을 확인해 짐 걱정 없이 이동하세요."
          />
          <FeatureItem
            icon={<Footprints size={22} className="text-green-500" />}
            bg="bg-green-50"
            title="상황에 맞는 이동 전략 추천"
            description="짐 유무와 도보 선호를 반영해 지금 가장 적절한 이동 방법을 추천해드려요."
            highlight={true}
          />
        </div>

        {/* CTA */}
        <div className="pb-14 pt-10">
          <button
            onClick={onStart}
            className="w-full py-4 bg-blue-500 text-white text-[16px] font-semibold rounded-2xl active:bg-blue-600 active:scale-[0.98] transition-all shadow-sm"
          >
            이동 경로 추천받기
          </button>
          <p className="text-center text-[12px] text-gray-400 mt-3">
            현재 서울역 · 강남역 · 성수역 중심으로 지원해요
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  bg,
  title,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-2xl border ${
        highlight ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"
      }`}
    >
      <div
        className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-semibold text-gray-900">{title}</p>
        <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

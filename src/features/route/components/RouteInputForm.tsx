"use client";

import { HUBS, getSubDestinations } from "@/config/demoPlaces";
import { RouteInputSchema } from "@/features/route/schemas/route.schema";
import type { TLockerPreference, TRouteInput } from "@/types";
import { useState } from "react";

type Props = {
  onSubmit: (input: TRouteInput) => void;
  isLoading: boolean;
};

export default function RouteInputForm({ onSubmit, isLoading }: Props) {
  const [hubId, setHubId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [hasLuggage, setHasLuggage] = useState<boolean | null>(null);
  const [lockerPreference, setLockerPreference] =
    useState<TLockerPreference | null>(null);
  const [preferLessWalking, setPreferLessWalking] = useState<boolean | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subDestinations = getSubDestinations(hubId);

  const isFormReady =
    hubId !== "" &&
    destinationId !== "" &&
    hasLuggage !== null &&
    (hasLuggage === false || lockerPreference !== null) &&
    preferLessWalking !== null;

  const handleHubChange = (id: string) => {
    setHubId(id);
    setDestinationId("");
  };

  const handleHasLuggageChange = (val: boolean) => {
    setHasLuggage(val);
    if (!val) setLockerPreference(null);
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const result = RouteInputSchema.safeParse({
      hubId,
      destinationId,
      hasLuggage: hasLuggage ?? false,
      lockerPreference: hasLuggage ? lockerPreference ?? undefined : undefined,
      preferLessWalking: preferLessWalking ?? false,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  const segClass = (active: boolean) =>
    [
      "flex-1 py-3 text-[14px] font-medium rounded-xl border transition active:scale-[0.97]",
      active
        ? "bg-blue-500 border-blue-500 text-white active:bg-blue-700"
        : "bg-white border-gray-200 text-gray-500 active:bg-gray-100",
    ].join(" ");

  const chipClass = (active: boolean) =>
    [
      "px-4 py-2.5 rounded-full text-[13px] font-medium border transition active:scale-[0.96]",
      active
        ? "bg-blue-500 border-blue-500 text-white active:bg-blue-700"
        : "bg-white border-gray-200 text-gray-500 active:bg-gray-100",
    ].join(" ");

  // 선택 요약
  const selectedHub = HUBS.find((h) => h.id === hubId);
  const selectedDest = subDestinations.find((d) => d.id === destinationId);
  const summaryParts: string[] = [];
  if (selectedHub && selectedDest)
    summaryParts.push(`${selectedHub.name} → ${selectedDest.name}`);
  if (hasLuggage !== null)
    summaryParts.push(hasLuggage ? "짐 있음" : "짐 없음");
  if (preferLessWalking !== null)
    summaryParts.push(preferLessWalking ? "도보 최소화" : "도보 가능");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── 이동 정보 ─────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          이동 정보
        </p>

        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-gray-800">
            서울 어디에 도착했나요?
          </p>
          <div className="flex gap-2">
            {HUBS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleHubChange(h.id)}
                className={segClass(hubId === h.id)}
              >
                {h.name}
              </button>
            ))}
          </div>
          {errors.hubId && (
            <p className="text-xs text-red-500">{errors.hubId}</p>
          )}
        </div>

        {hubId && (
          <div className="space-y-2">
            <p className="text-[15px] font-semibold text-gray-800">
              어디로 이동하시나요?
            </p>
            <div className="flex flex-wrap gap-2">
              {subDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDestinationId(d.id)}
                  className={chipClass(destinationId === d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {errors.destinationId && (
              <p className="text-xs text-red-500">{errors.destinationId}</p>
            )}
          </div>
        )}
      </div>

      {/* ── 조건 설정 ─────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          조건 설정
        </p>

        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-gray-800">
            짐이 있나요?
          </p>
          <p className="text-[12px] text-gray-400">
            짐 여부에 따라 이동 전략이 달라져요
          </p>
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => handleHasLuggageChange(val)}
                className={segClass(hasLuggage === val)}
              >
                {val ? "짐이 있어요" : "가볍게 왔어요"}
              </button>
            ))}
          </div>
        </div>

        {hasLuggage && (
          <div className="space-y-2">
            <p className="text-[15px] font-semibold text-gray-800">
              짐은 어디서 맡기고 싶으세요?
            </p>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    value: "hub",
                    label: "도착하자마자 맡기기",
                    desc: "거점 근처 보관함에 바로 맡기고 이동",
                  },
                  {
                    value: "destination",
                    label: "목적지 근처에서 맡기기",
                    desc: "목적지 도착 후 근처 보관함 이용",
                  },
                  {
                    value: "recommend",
                    label: "아직 모르겠어요 (추천받기)",
                    desc: "두 옵션 모두 비교해드립니다",
                  },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLockerPreference(value)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.98]",
                    lockerPreference === value
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-gray-200 text-gray-700 active:bg-gray-50",
                  ].join(" ")}
                >
                  <p className="text-[14px] font-medium">{label}</p>
                  <p
                    className={`text-[12px] mt-0.5 ${
                      lockerPreference === value
                        ? "text-blue-100"
                        : "text-gray-400"
                    }`}
                  >
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-gray-800">
            걷는 건 괜찮으신가요?
          </p>
          <p className="text-[12px] text-gray-400">
            도보 부담을 줄이는 방향으로 조정해드려요
          </p>
          <div className="flex gap-2">
            {([false, true] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setPreferLessWalking(val)}
                className={segClass(preferLessWalking === val)}
              >
                {val ? "적게 걷고 싶어요" : "걸어도 괜찮아요"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 선택 요약 ─────────────────────────────────── */}
      {summaryParts.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide mb-1">
            입력하신 조건
          </p>
          <p className="text-[13px] text-blue-700 font-medium">
            {summaryParts.join(" · ")}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!isFormReady || isLoading}
        className="w-full py-4 rounded-xl font-semibold text-[15px] transition active:scale-[0.98]
                   disabled:cursor-not-allowed
                   enabled:bg-blue-500 enabled:text-white enabled:active:bg-blue-700
                   disabled:bg-gray-100 disabled:text-gray-400"
      >
        {isLoading
          ? "추천 계산 중..."
          : isFormReady
          ? "이동 전략 추천받기"
          : "항목을 모두 선택해주세요"}
      </button>
    </form>
  );
}

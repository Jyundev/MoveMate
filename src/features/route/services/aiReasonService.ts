import type { TAvailability, TFailRisk, TTransportMode } from "@/types";
import OpenAI from "openai";

// 모듈 스코프에서 클라이언트 한 번만 생성
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_PROMPT = `당신은 서울 이동 경로 추천 앱 MoveMate의 AI 어시스턴트입니다.
사용자의 실시간 상황에 맞는 이동 전략을 자연스럽고 설득력 있는 한국어로 설명해주세요.

설명 작성 규칙:
- 1~2문장으로 간결하게 작성
- 실시간 수치(잔여 자전거 대수, 보관함 여유 칸수 등)를 구체적으로 언급
- 사용자 조건(짐 여부, 도보 선호도)을 자연스럽게 반영
- 이 전략이 왜 지금 이 상황에 최선인지 실제 데이터와 조건을 근거로 설명하세요 (추천 순위를 그대로 반복하지 마세요)
- 실패 위험도가 MEDIUM 또는 HIGH인 경우, 그 이유를 한 문장 안에서 짧게 언급하세요
- 필요하면 이 전략의 주의점이나 한계도 짧게 함께 언급하세요
- 존댓말 사용 (합니다/습니다 체)
- 이모지 사용 금지
- 앞뒤 따옴표 없이 설명 본문만 출력`;

export type AiReasonContext = {
  mode: TTransportMode;
  lockerLocation?: "hub" | "destination";
  totalMinutes: number;
  walkingDistanceM: number;
  hasLuggage: boolean;
  preferLessWalking: boolean;
  bikeCount?: number;
  bikeStationName?: string;
  bikeDistanceM?: number;
  lockerCount?: number;
  lockerName?: string;
  lockerDistanceM?: number;
  stability?: TAvailability;
  failRisk?: TFailRisk;
  hubName: string;
  destinationName: string;
  rank: number;
};

function buildUserPrompt(ctx: AiReasonContext): string {
  const modeLabel =
    ctx.mode === "WALK" ? "도보"
    : ctx.mode === "BIKE" ? "따릉이 자전거"
    : ctx.mode === "LOCKER_BIKE" ? "거점 짐 보관 후 자전거 이동"
    : ctx.lockerLocation === "hub" ? "도착 직후 짐 보관 후 도보 이동"
    : "목적지 근처 짐 보관 후 이동";

  const lines: string[] = [
    `이동 전략: ${modeLabel}`,
    `출발지: ${ctx.hubName} → 목적지: ${ctx.destinationName}`,
    `총 소요 시간: ${ctx.totalMinutes}분 / 예상 도보 거리: ${ctx.walkingDistanceM}m`,
    `사용자 조건: ${ctx.hasLuggage ? "짐 있음" : "짐 없음"}, ${
      ctx.preferLessWalking ? "도보 최소화 선호" : "도보 무관"
    }`,
    `실행 가능성: ${ctx.stability ?? "정보 없음"} / 실패 위험도: ${
      ctx.failRisk ?? "정보 없음"
    }`,
    `추천 순위: ${ctx.rank}위`,
  ];

  if (ctx.mode === "BIKE" && ctx.bikeCount !== undefined) {
    lines.push(
      `실시간 데이터 — 대여소: ${
        ctx.bikeStationName ?? "인근 대여소"
      }, 잔여 자전거: ${ctx.bikeCount}대, 대여소까지: ${
        ctx.bikeDistanceM ?? 0
      }m`
    );
  } else if (ctx.mode === "LOCKER_WALK" && ctx.lockerCount !== undefined) {
    const area =
      ctx.lockerLocation === "hub"
        ? `${ctx.hubName} 근처`
        : `${ctx.destinationName} 근처`;
    lines.push(
      `실시간 데이터 — 보관함 위치: ${area}(${
        ctx.lockerName ?? "인근 보관함"
      }), 여유 칸수: ${ctx.lockerCount}칸, 보관함까지: ${
        ctx.lockerDistanceM ?? 0
      }m`
    );
  }

  lines.push("", "위 이동 전략에 대한 설명을 작성해주세요.");
  return lines.join("\n");
}

const AI_TIMEOUT_MS = 3000;

/**
 * OpenAI API로 경로 추천 이유를 자연어로 강화합니다.
 * API 키 미설정, 오류, 3초 초과 시 null 반환 → 호출부에서 룰베이스 fallback 처리.
 */
export async function generateAiReason(
  ctx: AiReasonContext
): Promise<string | null> {
  if (!openai) return null;

  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), AI_TIMEOUT_MS)
    );
    const request = openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(ctx) },
      ],
      max_output_tokens: 120,
      temperature: 0.4,
    });

    const res = await Promise.race([request, timeout]);
    if (!res) {
      if (process.env.NODE_ENV === "development") console.warn("generateAiReason: timeout");
      return null;
    }

    const text = res.output_text?.trim() || null;
    if (process.env.NODE_ENV === "development") {
      console.log("generateAiReason:", text);
    }
    return text;
  } catch (err) {
    console.error("generateAiReason error:", err);
    return null;
  }
}

/**
 * 여러 경로에 대해 병렬로 AI 설명을 생성합니다.
 * 각 경로는 독립적으로 처리되며, 실패 시 해당 경로만 null 반환.
 */
export async function generateAiReasons(
  contexts: AiReasonContext[]
): Promise<(string | null)[]> {
  const results = await Promise.allSettled(contexts.map((ctx) => generateAiReason(ctx)));
  return results.map((r) => (r.status === "fulfilled" ? r.value : null));
}

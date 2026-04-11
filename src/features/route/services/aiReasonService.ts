import Anthropic from '@anthropic-ai/sdk';
import type { TTransportMode } from '@/types';

const SYSTEM_PROMPT = `당신은 서울 이동 경로 추천 앱 MoveMate의 AI 어시스턴트입니다.
사용자의 실시간 상황에 맞는 이동 전략을 자연스럽고 설득력 있는 한국어로 설명해주세요.

설명 작성 규칙:
- 2~3문장으로 간결하게 작성
- 실시간 수치(잔여 자전거 대수, 보관함 여유 칸수 등)를 구체적으로 언급
- 사용자 조건(짐 여부, 도보 선호도)을 자연스럽게 반영
- 이 전략이 왜 지금 이 상황에 최선인지 납득이 가도록 설명
- 존댓말 사용 (합니다/습니다 체)
- 이모지 사용 금지
- 앞뒤 따옴표 없이 설명 본문만 출력`;

export type AiReasonContext = {
  mode: TTransportMode;
  lockerLocation?: 'hub' | 'destination';
  totalMinutes: number;
  walkDistM: number;
  hasLuggage: boolean;
  preferLessWalking: boolean;
  bikeCount?: number;
  bikeStationName?: string;
  bikeDistanceM?: number;
  lockerCount?: number;
  lockerName?: string;
  lockerDistanceM?: number;
  hubName: string;
  destinationName: string;
  rank: number;
};

function buildUserPrompt(ctx: AiReasonContext): string {
  const modeLabel =
    ctx.mode === 'WALK' ? '도보'
    : ctx.mode === 'BIKE' ? '따릉이 자전거'
    : ctx.lockerLocation === 'hub' ? '거점 보관함 후 도보'
    : '목적지 보관함 후 도보';

  const lines: string[] = [
    `이동 전략: ${modeLabel}`,
    `출발지: ${ctx.hubName} → 목적지: ${ctx.destinationName}`,
    `총 소요 시간: ${ctx.totalMinutes}분 / 도보 거리: ${ctx.walkDistM}m`,
    `사용자 조건: ${ctx.hasLuggage ? '짐 있음' : '짐 없음'}, ${ctx.preferLessWalking ? '도보 최소화 선호' : '도보 무관'}`,
    `추천 순위: ${ctx.rank}위`,
  ];

  if (ctx.mode === 'BIKE' && ctx.bikeCount !== undefined) {
    lines.push(
      `실시간 데이터 — 대여소: ${ctx.bikeStationName ?? '인근 대여소'}, 잔여 자전거: ${ctx.bikeCount}대, 대여소까지: ${ctx.bikeDistanceM ?? 0}m`
    );
  } else if (ctx.mode === 'LOCKER_WALK' && ctx.lockerCount !== undefined) {
    const area = ctx.lockerLocation === 'hub' ? `${ctx.hubName} 근처` : `${ctx.destinationName} 근처`;
    lines.push(
      `실시간 데이터 — 보관함 위치: ${area}(${ctx.lockerName ?? '인근 보관함'}), 여유 칸수: ${ctx.lockerCount}칸, 보관함까지: ${ctx.lockerDistanceM ?? 0}m`
    );
  }

  lines.push('', '위 이동 전략에 대한 설명을 작성해주세요.');
  return lines.join('\n');
}

/**
 * Claude API로 경로 추천 이유를 더 자연스러운 한국어로 강화합니다.
 * API 키 미설정 또는 오류 시 null을 반환 → 호출부에서 fallback 처리.
 *
 * 모델: claude-opus-4-6 (기본값)
 * 비용 절감이 필요하면 claude-haiku-4-5 로 교체 가능.
 */
export async function generateAiReason(
  ctx: AiReasonContext
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    });
    const response = await stream.finalMessage();
    const text =
      response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
    return text || null;
  } catch {
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
  return Promise.all(contexts.map((ctx) => generateAiReason(ctx)));
}

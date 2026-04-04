'use client';

import { routeKeys } from '@/features/route/queries/routeKeys';
import type { TRecommendResult, TRouteInput } from '@/types';
import { useQuery } from '@tanstack/react-query';

async function fetchRouteRecommend(input: TRouteInput): Promise<TRecommendResult> {
  const res = await fetch('/api/route-recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message ?? '추천 경로를 불러오지 못했습니다.');
  return json.data;
}

export function useRouteRecommend(input: TRouteInput | null) {
  return useQuery({
    queryKey: input ? routeKeys.recommend(input) : routeKeys.all,
    queryFn: () => fetchRouteRecommend(input!),
    enabled: !!input,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });
}

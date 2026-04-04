import type { TRouteInput } from '@/types';

export const routeKeys = {
  all: ['route'] as const,
  recommend: (input: TRouteInput) => [...routeKeys.all, 'recommend', input] as const,
};

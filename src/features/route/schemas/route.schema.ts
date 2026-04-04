import { z } from 'zod';

export const RouteInputSchema = z.object({
  hubId: z.string().min(1, '도착 거점을 선택해주세요.'),
  destinationId: z.string().min(1, '최종 목적지를 선택해주세요.'),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다. (HH:mm)')
    .optional()
    .or(z.literal('')),
  hasLuggage: z.boolean(),
  preferLessWalking: z.boolean(),
});

export type RouteInput = z.infer<typeof RouteInputSchema>;

import { z } from 'zod';

export const RouteInputSchema = z.object({
  origin: z.string().min(1, '출발지를 입력해주세요.'),
  destination: z.string().min(1, '도착지를 입력해주세요.'),
  arrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다. (HH:mm)'),
  hasLuggage: z.boolean(),
  preferLessWalking: z.boolean(),
});

export type RouteInput = z.infer<typeof RouteInputSchema>;

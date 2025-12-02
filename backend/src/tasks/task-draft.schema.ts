import { z } from 'zod';

export const TaskDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  goal: z.string().min(1),
  instructions: z.string().default(''),
  route: z.string().min(1),
  role: z.string().default('analyst'),
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;

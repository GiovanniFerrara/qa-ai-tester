import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  CLAUDE_API_KEY: z.string().min(1, 'CLAUDE_API_KEY is required'),
  GEMINI_API_KEY: z
    .string()
    .min(1, 'GEMINI_API_KEY is required when using the Gemini provider')
    .optional(),
  BASE_URL: z.string().url().default('https://example.com'),
  TASKS_DB_PATH: z.string().optional(),
  RUNS_DB_PATH: z.string().optional(),
  TASK_COLLECTIONS_DB_PATH: z.string().optional(),
  COLLECTION_RUNS_DB_PATH: z.string().optional(),
  STORAGE_STATE_PATH: z.string().default('playwright/.auth/analyst.json'),
  ARTIFACT_DIR: z.string().default('artifacts'),
  LOGIN_USERNAME: z.string().default('demo@jurny.com'),
  LOGIN_PASSWORD: z.string().default('demo@jurny.com'),
  DEFAULT_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
  OPENAI_MODEL: z.string().default('computer-use-preview'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-sonnet-20250219'),
  GEMINI_MODEL: z.string().default('gemini-2.5-computer-use-preview-10-2025'),
});

export type AppEnvironment = z.infer<typeof EnvSchema>;

export const validateEnvironment = (config: Record<string, unknown>): AppEnvironment => {
  const parsed = EnvSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }

  return parsed.data;
};

export const env = validateEnvironment(process.env);

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),

  EMAIL_PROVIDER: z.enum(['ses', 'console']).default('console'),
  AWS_REGION: z.string().default('ap-south-1'),
  SES_FROM_EMAIL: z.string().default('Bubbles <no-reply@resume-folio.app>'),

  S3_BUCKET: z.string().default('bubbles'),
  S3_REGION: z.string().default('ap-south-1'),

  OPENAI_API_KEY: z.string().optional(),

  DEFAULT_MONTHLY_COST_CEILING_USD: z.coerce.number().default(20),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;

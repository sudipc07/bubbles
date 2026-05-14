import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3002),
  PUBLIC_URL: z.string().url().default('http://localhost:3002'),

  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),

  EMAIL_PROVIDER: z.enum(['ses', 'console']).default('console'),
  AWS_REGION: z.string().default('ap-south-1'),
  SES_FROM_EMAIL: z.string().default('Bubbles <no-reply@resume-folio.app>'),

  S3_BUCKET: z.string().default('bubbles'),
  S3_REGION: z.string().default('ap-south-1'),

  OPENAI_API_KEY: z.string().optional(),

  DEFAULT_MONTHLY_COST_CEILING_USD: z.coerce.number().default(20),

  // Login bypass. If both are set, the exact email + code pair verifies without
  // hitting SES or the login_codes table, and the resulting user is is_admin.
  // Use for the platform owner only; treat the code as a secret.
  BYPASS_EMAIL: z.string().email().optional(),
  BYPASS_CODE: z.string().regex(/^\d{6}$/).optional(),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;

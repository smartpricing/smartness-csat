import { z } from 'zod';

export const SaveFeedbackParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
  feature_key: z.string().describe('Feature key'),
});

export const SaveFeedbackBodySchema = z.object({
  user_email: z.string().email().describe('User email address'),
  rating: z.number().int().min(1).max(10).describe('Rating from 1 to 10'),
  comment: z.string().optional().describe('Optional free text comment'),
  source: z.enum(['prompted', 'voluntary']).describe('Whether feedback was prompted or voluntary'),
  user_agent: z.string().optional().describe('User agent string from the browser'),
});

export const SaveFeedbackResponseSchema = z.object({
  user_email: z.string().describe('User email address'),
  rating: z.number().describe('Rating from 1 to 10'),
  comment: z.string().nullable().describe('Free text comment'),
  source: z.string().describe('Whether feedback was prompted or voluntary'),
  user_agent: z.string().nullable().describe('User agent string from the browser'),
  created_at: z.string().describe('Created at'),
});

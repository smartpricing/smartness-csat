import { z } from 'zod';

export const GetFeatureInteractionAnalyticsParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
  feature_key: z.string().describe('Feature key'),
});

export const FeatureInteractionSummarySchema = z.object({
  total_users: z.number().describe('Total number of users who have an interaction record for this feature'),
  users_with_interactions: z.number().describe('Users with at least one interaction'),
  avg_total_interactions: z.number().describe('Average total interaction count across all users (rounded)'),
  max_total_interactions: z.number().describe('Highest total interaction count recorded for a single user'),
  users_pending_feedback: z.number().describe('Users for whom the CSAT prompt should currently be shown'),
  users_rejection_exhausted: z.number().describe('Users who have exhausted their rejection threshold and will never be prompted again'),
});

export const FeatureInteractionUserRowSchema = z.object({
  user_email: z.string().describe('User email'),
  interaction_count: z.number().describe('Interactions since last rejection'),
  total_interaction_count: z.number().describe('All-time interaction count'),
  rejection_count: z.number().describe('Number of times the user dismissed the CSAT prompt'),
  should_request_feedback: z.boolean().describe('Whether the prompt should be shown right now'),
  latest_user_agent: z.string().nullable().describe('Last recorded user agent'),
  updated_at: z.string().describe('Last interaction timestamp'),
});

export const GetFeatureInteractionAnalyticsResponseSchema = z.object({
  summary: FeatureInteractionSummarySchema,
  users: z.array(FeatureInteractionUserRowSchema),
});

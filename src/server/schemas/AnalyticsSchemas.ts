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

export const GetFeatureInteractionAnalyticsResponseSchema = z.object({
  summary: FeatureInteractionSummarySchema,
});

export const PaginatedListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).describe('Number of items per page (max 100)'),
  cursor: z.string().optional().describe('Cursor for pagination'),
});

export const UserInteractionItemSchema = z.object({
  id: z.string().describe('Interaction record ID'),
  user_email: z.string().describe('User email'),
  interaction_count: z.number().describe('Interactions since last rejection'),
  total_interaction_count: z.number().describe('All-time interaction count'),
  rejection_count: z.number().describe('Number of times the user dismissed the CSAT prompt'),
  should_request_feedback: z.boolean().describe('Whether the prompt should be shown right now'),
  created_at: z.string().describe('First interaction timestamp'),
  updated_at: z.string().describe('Last interaction timestamp'),
});

export const GetUserInteractionsListResponseSchema = z.object({
  data: z.array(UserInteractionItemSchema),
  next_cursor: z.string().nullable().describe('Cursor for the next page'),
  has_more: z.boolean().describe('Whether there are more items'),
});

export const FeedbackItemSchema = z.object({
  id: z.string().describe('Feedback ID'),
  user_email: z.string().describe('User email'),
  rating: z.number().describe('Rating from 1 to 10'),
  comment: z.string().nullable().describe('Optional comment'),
  source: z.string().describe('Whether feedback was prompted or voluntary'),
  user_agent: z.string().nullable().describe('User agent string'),
  created_at: z.string().describe('Feedback submission timestamp'),
});

export const GetFeedbacksListResponseSchema = z.object({
  data: z.array(FeedbackItemSchema),
  next_cursor: z.string().nullable().describe('Cursor for the next page'),
  has_more: z.boolean().describe('Whether there are more items'),
});

export const FeedbackSummarySchema = z.object({
  total_feedbacks: z.number().describe('Total number of feedback submissions'),
  average_rating: z.number().describe('Average rating across all feedbacks'),
  median_rating: z.number().describe('Median rating'),
  prompted_count: z.number().describe('Number of prompted feedbacks'),
  voluntary_count: z.number().describe('Number of voluntary feedbacks'),
});

export const GetFeedbackSummaryAnalyticsResponseSchema = z.object({
  summary: FeedbackSummarySchema,
});

export const MonthlyFeedbackDataSchema = z.object({
  year: z.number().describe('Year'),
  month: z.number().describe('Month (1-12)'),
  feedback_count: z.number().describe('Number of feedbacks'),
  average_rating: z.number().describe('Average rating'),
  median_rating: z.number().describe('Median rating'),
});

export const QuarterlyFeedbackDataSchema = z.object({
  year: z.number().describe('Year'),
  quarter: z.number().describe('Quarter (1-4)'),
  feedback_count: z.number().describe('Number of feedbacks'),
  average_rating: z.number().describe('Average rating'),
  median_rating: z.number().describe('Median rating'),
});

export const GetFeedbackTimeSeriesResponseSchema = z.object({
  monthly: z.array(MonthlyFeedbackDataSchema).describe('Monthly breakdown'),
  quarterly: z.array(QuarterlyFeedbackDataSchema).describe('Quarterly breakdown'),
});

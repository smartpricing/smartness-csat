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

export const TranslateFeedbacksResponseSchema = z.object({
  translated_count: z.number().describe('Number of feedbacks translated in this run'),
});

export const SyncFeedbacksResponseSchema = z.object({
  done_count: z.number().describe('Number of feedbacks synced to Zapier and marked as done in this run'),
});

export const UpdateFeedbackNotesParamsSchema = z.object({
  feedback_id: z.string().uuid().describe('Feedback ID'),
});

export const UpdateFeedbackNotesBodySchema = z.object({
  notes: z.string().nullable().describe('Free text notes from the PO'),
  updated_by: z.string().email().describe('Email of the user updating the notes'),
});

export const UpdateFeedbackNotesResponseSchema = z.object({
  id: z.string().describe('Feedback ID'),
  notes: z.string().nullable().describe('Updated notes'),
  notes_updated_by: z.string().nullable().describe('Email of the user who updated the notes'),
  notes_updated_at: z.string().nullable().describe('Timestamp when notes were updated'),
});

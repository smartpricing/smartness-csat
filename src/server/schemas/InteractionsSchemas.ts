import { z } from 'zod';

export const ProductFeatureParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
  feature_key: z.string().describe('Feature key'),
});

export const IncrementInteractionBodySchema = z.object({
  user_email: z.string().email().describe('User email address'),
});

export const IncrementInteractionResponseSchema = z.object({
  user_email: z.string().describe('User email address'),
  interaction_count: z.number().describe('Interaction count since last rejection'),
  total_interaction_count: z.number().describe('Total interaction count'),
  interaction_threshold: z.number().describe('Interactions required before CSAT prompt'),
  rejection_count: z.number().describe('Total rejection count'),
  rejection_threshold: z.number().describe('Rejections before disabling prompt'),
  should_request_feedback: z.boolean().describe('Whether the CSAT prompt should be shown'),
  created_at: z.string().describe('Created at'),
  updated_at: z.string().describe('Updated at'),
});

export const RejectInteractionBodySchema = z.object({
  user_email: z.string().email().describe('User email address'),
});

export const RejectInteractionResponseSchema = z.object({
  user_email: z.string().describe('User email address'),
  interaction_count: z.number().describe('Interaction count since last rejection (reset to 0)'),
  total_interaction_count: z.number().describe('Total interaction count'),
  interaction_threshold: z.number().describe('Interactions required before CSAT prompt'),
  rejection_count: z.number().describe('Total rejection count'),
  rejection_threshold: z.number().describe('Rejections before disabling prompt'),
  should_request_feedback: z.boolean().describe('Whether the CSAT prompt should be shown'),
  created_at: z.string().describe('Created at'),
  updated_at: z.string().describe('Updated at'),
});

export const GetFeatureInteractionsParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
});

export const GetFeatureInteractionsQuerySchema = z.object({
  user_email: z.string().email().describe('User email address'),
});

export const FeatureInteractionEntitySchema = z.object({
  product_feature_key: z.string().describe('Feature key'),
  product_feature_description: z.string().nullable().describe('Feature description'),
  interaction_count: z.number().describe('Interaction count since last rejection'),
  total_interaction_count: z.number().describe('Total interaction count'),
  interaction_threshold: z.number().describe('Interactions required before CSAT prompt'),
  rejection_count: z.number().describe('Total rejection count'),
  rejection_threshold: z.number().describe('Rejections before disabling prompt'),
  should_request_feedback: z.boolean().describe('Whether the CSAT prompt should be shown'),
});

export const GetFeatureInteractionsResponseSchema = z.object({
  data: z.array(FeatureInteractionEntitySchema),
});

export const GetFeaturesQuerySchema = z.object({
  product_key: z.union([z.string(), z.array(z.string())]).optional().describe('Filter by product key(s)'),
});

export const FeatureEntitySchema = z.object({
  product_key: z.string().describe('Product key'),
  feature_key: z.string().describe('Feature key'),
  name: z.string().nullable().describe('Feature display name'),
  description: z.string().nullable().describe('Feature description'),
  interaction_threshold: z.number().describe('Interactions required before CSAT prompt'),
  rejection_threshold: z.number().describe('Rejections before disabling prompt'),
});

export const GetFeaturesResponseSchema = z.object({
  data: z.array(FeatureEntitySchema),
});

export const CreateFeatureParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
});

export const CreateFeatureBodySchema = z.object({
  feature_key: z
    .string()
    .regex(/^[a-zA-Z0-9\-_.+]+$/, 'feature_key must only contain ASCII letters, numbers, or - _ . +')
    .describe('Feature key (ASCII letters, numbers, -, _, ., + only)'),
  description: z.string().optional().describe('Feature description'),
  interaction_threshold: z.number().int().min(1).describe('Interactions required before CSAT prompt'),
  rejection_threshold: z.number().int().min(1).describe('Rejections before disabling prompt'),
});

export const CreateFeatureResponseSchema = FeatureEntitySchema;

export const UpdateFeatureParamsSchema = z.object({
  product_key: z.string().describe('Product key'),
  feature_key: z.string().describe('Feature key'),
});

export const UpdateFeatureBodySchema = z
  .object({
    name: z.string().nullable().optional().describe('Feature display name (null to clear)'),
    description: z.string().nullable().optional().describe('Feature description (null to clear)'),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one of name or description must be provided',
  });

export const UpdateFeatureResponseSchema = FeatureEntitySchema;

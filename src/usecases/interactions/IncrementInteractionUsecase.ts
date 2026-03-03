import { subDays } from 'date-fns';
import type { PostgresClient } from '../../clients/PostgresClient.js';
import { NotFoundError } from '../../types/errors.js';
import { getUserFirstLiveDate } from '../../utils/getUserFirstLiveDate.js';

type IncrementInteractionParams = {
  productKey: string;
  featureKey: string;
  userEmail: string;
};

type IncrementInteractionResponse = {
  user_email: string;
  interaction_count: number;
  total_interaction_count: number;
  interaction_threshold: number;
  rejection_count: number;
  rejection_threshold: number;
  should_request_feedback: boolean;
  created_at: string;
  updated_at: string;
};

export class IncrementInteractionUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: IncrementInteractionParams): Promise<IncrementInteractionResponse> {
    const feature = await this._resolveFeature(params.productKey, params.featureKey);
    const lastFeedbackAt = await this._getLastFeedbackDate(params.userEmail, feature.id);

    const sixMonthsAgo = subDays(new Date(), 180);
    const hasRecentFeedback = lastFeedbackAt && lastFeedbackAt > sixMonthsAgo;

    const hasEnoughProductKnowledge = await this._hasEnoughProductKnowledge(params.userEmail);

    const shouldIncrementInteractionCount = !hasRecentFeedback && hasEnoughProductKnowledge;

    const result = shouldIncrementInteractionCount
      ? await this._incrementBoth(params.userEmail, feature.id)
      : await this._incrementTotalOnly(params.userEmail, feature.id);

    const row = result.rows[0]!;

    const meetsThreshold = row.interaction_count >= feature.interaction_threshold;
    const belowRejectionLimit = row.rejection_count < feature.rejection_threshold;

    return {
      user_email: row.user_email,
      interaction_count: row.interaction_count,
      total_interaction_count: row.total_interaction_count,
      interaction_threshold: feature.interaction_threshold,
      rejection_count: row.rejection_count,
      rejection_threshold: feature.rejection_threshold,
      should_request_feedback: meetsThreshold && belowRejectionLimit && !hasRecentFeedback,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private async _hasEnoughProductKnowledge(userEmail: string): Promise<boolean> {
    const firstLiveDateStr = await getUserFirstLiveDate(userEmail);

    if (!firstLiveDateStr) {
      return false;
    }

    const firstLiveDate = new Date(firstLiveDateStr);
    const thirtyDaysAgo = subDays(new Date(), 30);

    return firstLiveDate <= thirtyDaysAgo;
  }

  private async _incrementBoth(userEmail: string, featureId: string) {
    return this._postgresClient.client.query<{
      user_email: string;
      interaction_count: number;
      total_interaction_count: number;
      rejection_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO csat.user_feature_interaction (user_email, product_feature_id, interaction_count, total_interaction_count)
       VALUES ($1, $2, 1, 1)
       ON CONFLICT (user_email, product_feature_id)
       DO UPDATE SET
         interaction_count = csat.user_feature_interaction.interaction_count + 1,
         total_interaction_count = csat.user_feature_interaction.total_interaction_count + 1,
         updated_at = NOW()
       RETURNING user_email, interaction_count, total_interaction_count, rejection_count, created_at, updated_at`,
      [userEmail, featureId],
    );
  }

  private async _incrementTotalOnly(userEmail: string, featureId: string) {
    return this._postgresClient.client.query<{
      user_email: string;
      interaction_count: number;
      total_interaction_count: number;
      rejection_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO csat.user_feature_interaction (user_email, product_feature_id, interaction_count, total_interaction_count)
       VALUES ($1, $2, 0, 1)
       ON CONFLICT (user_email, product_feature_id)
       DO UPDATE SET
         total_interaction_count = csat.user_feature_interaction.total_interaction_count + 1,
         updated_at = NOW()
       RETURNING user_email, interaction_count, total_interaction_count, rejection_count, created_at, updated_at`,
      [userEmail, featureId],
    );
  }

  private async _getLastFeedbackDate(userEmail: string, featureId: string): Promise<Date | null> {
    const result = await this._postgresClient.client.query<{ last_feedback_at: Date }>(
      `SELECT MAX(created_at) AS last_feedback_at
       FROM csat.user_feedback
       WHERE user_email = $1 AND product_feature_id = $2`,
      [userEmail, featureId],
    );
    return result.rows[0]?.last_feedback_at ?? null;
  }

  private async _resolveFeature(
    productKey: string,
    featureKey: string,
  ): Promise<{ id: string; interaction_threshold: number; rejection_threshold: number }> {
    const result = await this._postgresClient.client.query<{
      id: string;
      interaction_threshold: number;
      rejection_threshold: number;
    }>(
      `SELECT pf.id, pf.interaction_threshold, pf.rejection_threshold
       FROM csat.product_feature pf
       JOIN csat.product p ON p.key = pf.product_key
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Feature', `${productKey}/${featureKey}`);
    }

    return result.rows[0]!;
  }
}

import axios from 'axios';
import type { PostgresClient } from '../../clients/PostgresClient.js';
import { getConfig } from '../../config.js';
import { logger } from '../../utils/logger.js';

const BATCH_SIZE = 50;

type FeedbackRow = {
  id: string;
  user_email: string;
  product_key: string;
  feature_key: string;
  feature_name: string;
  rating: number;
  comment: string | null;
  comment_en: string | null;
  source: string;
  created_at: Date;
};

export type SyncFeedbacksResponse = {
  done_count: number;
};

export class SyncFeedbacksUsecase {
  private readonly _zapierWebhookUrl: string;

  constructor(private readonly _postgresClient: PostgresClient) {
    this._zapierWebhookUrl = getConfig().zapier.webhookUrl;
  }

  async execute(): Promise<SyncFeedbacksResponse> {
    const feedbacks = await this._fetchTranslated();

    if (feedbacks.length === 0) {
      return { done_count: 0 };
    }

    logger.info({ msg: 'Processing TRANSLATED batch', count: feedbacks.length });

    const doneIds: string[] = [];

    for (const feedback of feedbacks) {
      try {
        await this._syncToZapier(feedback);
        doneIds.push(feedback.id);
      } catch (error) {
        logger.error({ msg: 'Failed to sync feedback to Zapier, skipping', feedbackId: feedback.id, error });
      }
    }

    if (doneIds.length === 0) {
      return { done_count: 0 };
    }

    await this._batchUpdateToDone(doneIds);

    logger.info({ msg: 'Batch synced and marked as DONE', count: doneIds.length });

    return { done_count: doneIds.length };
  }

  private async _fetchTranslated(): Promise<FeedbackRow[]> {
    const result = await this._postgresClient.client.query<FeedbackRow>(
      `SELECT
         uf.id,
         uf.user_email,
         pf.product_key,
         pf.key AS feature_key,
         pf.name AS feature_name,
         uf.rating,
         uf.comment,
         uf.comment_en,
         uf.source,
         uf.created_at
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE uf.state = 'TRANSLATED'
       ORDER BY uf.created_at ASC
       LIMIT $1`,
      [BATCH_SIZE],
    );

    return result.rows;
  }

  private async _syncToZapier(feedback: FeedbackRow): Promise<void> {
    await axios.post(this._zapierWebhookUrl, {
      feedback_id: feedback.id,
      user_email: feedback.user_email,
      product_key: feedback.product_key,
      feature_key: feedback.feature_key,
      feature_name: feedback.feature_name,
      rating: feedback.rating,
      comment: feedback.comment,
      comment_en: feedback.comment_en,
      source: feedback.source,
      created_at: feedback.created_at.toISOString(),
      created_at_date: feedback.created_at.toISOString().slice(0, 10),
    });

    logger.debug({ msg: 'Feedback synced to Zapier', feedbackId: feedback.id });
  }

  private async _batchUpdateToDone(ids: string[]): Promise<void> {
    await this._postgresClient.client.query(
      `UPDATE csat.user_feedback
       SET state = 'DONE',
           synced_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }
}

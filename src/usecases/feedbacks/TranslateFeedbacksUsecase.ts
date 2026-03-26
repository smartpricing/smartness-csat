import { ApiGatewayClient } from '../../clients/ApiGatewayClient.js';
import type { PostgresClient } from '../../clients/PostgresClient.js';
import { logger } from '../../utils/logger.js';

const BATCH_SIZE = 50;

type FeedbackRow = {
  id: string;
  comment: string | null;
};

type TranslationResult = {
  id: string;
  comment_en: string | null;
};

type TranslateSingleResponse = {
  translatedText: string;
  detectedLanguage?: {
    language: string;
    confidence: number;
  };
};

export type TranslateFeedbacksResponse = {
  translated_count: number;
};

export class TranslateFeedbacksUsecase {
  constructor(
    private readonly _postgresClient: PostgresClient,
    private readonly _apiGatewayClient: ApiGatewayClient = ApiGatewayClient.getInstance(),
  ) {}

  async execute(): Promise<TranslateFeedbacksResponse> {
    const feedbacks = await this._fetchPending();

    if (feedbacks.length === 0) {
      return { translated_count: 0 };
    }

    logger.info({ msg: 'Processing PENDING batch', count: feedbacks.length });

    const withComments = feedbacks.filter((f) => f.comment);
    const withoutComments = feedbacks.filter((f) => !f.comment);

    const translations: TranslationResult[] = [];

    for (const feedback of withoutComments) {
      translations.push({ id: feedback.id, comment_en: null });
    }

    for (const feedback of withComments) {
      const comment = feedback.comment as string;
      try {
        const comment_en = await this._translateComment(comment);
        translations.push({ id: feedback.id, comment_en });
      } catch (error) {
        logger.error({ msg: 'Translation failed for feedback, keeping original', feedbackId: feedback.id, error });
        translations.push({ id: feedback.id, comment_en: comment });
      }
    }

    await this._batchUpdateToTranslated(translations);

    logger.info({ msg: 'Batch translated successfully', count: translations.length });

    return { translated_count: translations.length };
  }

  private async _fetchPending(): Promise<FeedbackRow[]> {
    const result = await this._postgresClient.client.query<FeedbackRow>(
      `SELECT id, comment
       FROM csat.user_feedback
       WHERE state = 'PENDING'
       ORDER BY created_at ASC
       LIMIT $1`,
      [BATCH_SIZE],
    );

    return result.rows;
  }

  private async _translateComment(comment: string): Promise<string> {
    const response = await this._apiGatewayClient.post<TranslateSingleResponse>('/api/translate/v1/translate', {
      q: comment,
      source: 'auto',
      target: 'en',
    });

    if (response.detectedLanguage?.language === 'en') {
      return comment;
    }

    return response.translatedText;
  }

  /**
   * Uses unnest to update the entire batch in a single query.
   */
  private async _batchUpdateToTranslated(translations: TranslationResult[]): Promise<void> {
    const ids = translations.map((t) => t.id);
    const comments = translations.map((t) => t.comment_en);

    await this._postgresClient.client.query(
      `UPDATE csat.user_feedback AS uf
       SET state = 'TRANSLATED',
           comment_en = data.comment_en,
           translated_at = NOW()
       FROM (
         SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS comment_en
       ) AS data
       WHERE uf.id = data.id`,
      [ids, comments],
    );
  }
}

import { ApiGatewayClient } from '../../clients/ApiGatewayClient.js';
import type { PostgresClient } from '../../clients/PostgresClient.js';
import { logger } from '../../utils/logger.js';

const BATCH_SIZE = 50;

type FeedbackRow = {
  id: string;
  comment: string | null;
  comment_en: string | null;
};

type TranslationResult = {
  id: string;
  comment_en: string | null;
};

type TranslateBatchResponse = {
  translatedText: string[];
  detectedLanguage?: {
    language: string;
    confidence: number;
  }[];
};

export type ProcessFeedbacksResponse = {
  translated_count: number;
  done_count: number;
};

export class ProcessFeedbacksUsecase {
  constructor(
    private readonly _postgresClient: PostgresClient,
    private readonly _apiGatewayClient: ApiGatewayClient = ApiGatewayClient.getInstance(),
  ) {}

  async execute(): Promise<ProcessFeedbacksResponse> {
    const translatedCount = await this._processPendingToTranslated();
    const doneCount = await this._processTranslatedToDone();

    return {
      translated_count: translatedCount,
      done_count: doneCount,
    };
  }

  /**
   * Fetches a batch of PENDING feedbacks, translates them in a single API call,
   * then updates all in a single database query.
   */
  private async _processPendingToTranslated(): Promise<number> {
    const feedbacks = await this._fetchByState('PENDING');

    if (feedbacks.length === 0) {
      return 0;
    }

    logger.info({ msg: 'Processing PENDING batch', count: feedbacks.length });

    const withComments = feedbacks.filter((f) => f.comment);
    const withoutComments = feedbacks.filter((f) => !f.comment);

    const translations: TranslationResult[] = [];

    // Feedbacks without comments go straight to TRANSLATED with null
    for (const feedback of withoutComments) {
      translations.push({ id: feedback.id, comment_en: null });
    }

    // Batch translate all comments in a single API call
    if (withComments.length > 0) {
      try {
        const comments = withComments.map((f) => f.comment as string);
        const translatedComments = await this._batchTranslateComments(comments);

        for (let i = 0; i < withComments.length; i++) {
          const feedback = withComments[i]!;
          const translatedText = translatedComments[i] ?? feedback.comment;
          translations.push({ id: feedback.id, comment_en: translatedText });
        }
      } catch (error) {
        logger.error({ msg: 'Batch translation failed', error });
        return 0;
      }
    }

    if (translations.length === 0) {
      return 0;
    }

    await this._batchUpdateToTranslated(translations);

    logger.info({ msg: 'Batch translated successfully', count: translations.length });

    return translations.length;
  }

  /**
   * Fetches a batch of TRANSLATED feedbacks, syncs them to external system,
   * then updates all to DONE in a single query.
   */
  private async _processTranslatedToDone(): Promise<number> {
    const feedbacks = await this._fetchByState('TRANSLATED');

    if (feedbacks.length === 0) {
      return 0;
    }

    logger.info({ msg: 'Processing TRANSLATED batch', count: feedbacks.length });

    const doneIds: string[] = [];

    for (const feedback of feedbacks) {
      try {
        await this._syncToExternalSystem(feedback);
        doneIds.push(feedback.id);
      } catch (error) {
        logger.error({
          msg: 'Failed to sync feedback, skipping',
          feedbackId: feedback.id,
          error,
        });
      }
    }

    if (doneIds.length === 0) {
      return 0;
    }

    await this._batchUpdateToDone(doneIds);

    logger.info({ msg: 'Batch marked as DONE', count: doneIds.length });

    return doneIds.length;
  }

  private async _fetchByState(state: string): Promise<FeedbackRow[]> {
    const result = await this._postgresClient.client.query<FeedbackRow>(
      `SELECT id, comment, comment_en
       FROM csat.user_feedback
       WHERE state = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [state, BATCH_SIZE],
    );

    return result.rows;
  }

  /**
   * Updates only the feedbacks with the given IDs to TRANSLATED state.
   * Uses unnest to perform a single query for the entire batch.
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

  /**
   * Updates only the feedbacks with the given IDs to DONE state.
   */
  private async _batchUpdateToDone(ids: string[]): Promise<void> {
    await this._postgresClient.client.query(
      `UPDATE csat.user_feedback
       SET state = 'DONE'
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  /**
   * Batch translates comments to English using LibreTranslate API.
   * If a comment is already in English, returns the original.
   */
  private async _batchTranslateComments(comments: string[]): Promise<string[]> {
    const response = await this._apiGatewayClient.post<TranslateBatchResponse>(
      '/api/translate/v1/translate',
      {
        q: comments,
        source: 'auto',
        target: 'en',
      },
    );

    const results: string[] = [];

    for (let i = 0; i < comments.length; i++) {
      const original = comments[i]!;
      const translated = response.translatedText[i] ?? original;
      const detectedLang = response.detectedLanguage?.[i]?.language;

      // If already in English, keep original
      if (detectedLang === 'en') {
        results.push(original);
      } else {
        results.push(translated);
      }
    }

    logger.info({ msg: 'Batch translation completed', count: comments.length });

    return results;
  }

  /**
   * Placeholder for external system sync.
   * TODO: Replace with actual external sync API call.
   */
  private async _syncToExternalSystem(feedback: FeedbackRow): Promise<void> {
    logger.info({ msg: 'External sync placeholder called', feedbackId: feedback.id });
  }
}

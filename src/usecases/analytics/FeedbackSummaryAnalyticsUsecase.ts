import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
};

type Summary = {
  total_feedbacks: number;
  average_rating: number;
  median_rating: number;
  pm_rating: number;
  prompted_count: number;
  voluntary_count: number;
};

export type FeedbackSummaryAnalyticsResponse = {
  summary: Summary;
};

export class FeedbackSummaryAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<FeedbackSummaryAnalyticsResponse> {
    const { productKey, featureKey } = params;

    const summaryResult = await this._postgresClient.client.query<{
      total_feedbacks: string;
      average_rating: string | null;
      positive_count: string;
      prompted_count: string;
      voluntary_count: string;
    }>(
      `SELECT
         COUNT(*)::TEXT AS total_feedbacks,
         AVG(uf.rating)::TEXT AS average_rating,
         COUNT(*) FILTER (WHERE uf.rating > 5)::TEXT AS positive_count,
         COUNT(*) FILTER (WHERE uf.source = 'prompted')::TEXT AS prompted_count,
         COUNT(*) FILTER (WHERE uf.source = 'voluntary')::TEXT AS voluntary_count
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    const ratingsResult = await this._postgresClient.client.query<{
      ratings: number[];
    }>(
      `SELECT ARRAY_AGG(uf.rating ORDER BY uf.rating) AS ratings
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    const row = summaryResult.rows[0];
    const ratings = ratingsResult.rows[0]?.ratings ?? [];

    const totalFeedbacks = Number.parseInt(row?.total_feedbacks ?? '0', 10);
    const positiveCount = Number.parseInt(row?.positive_count ?? '0', 10);

    return {
      summary: {
        total_feedbacks: totalFeedbacks,
        average_rating: row?.average_rating
          ? Number.parseFloat(Number.parseFloat(row.average_rating).toFixed(2))
          : 0,
        median_rating: this._calculateMedian(ratings),
        pm_rating: totalFeedbacks > 0 ? Number.parseFloat((positiveCount / totalFeedbacks).toFixed(2)) : 0,
        prompted_count: Number.parseInt(row?.prompted_count ?? '0', 10),
        voluntary_count: Number.parseInt(row?.voluntary_count ?? '0', 10),
      },
    };
  }

  private _calculateMedian(sortedRatings: number[]): number {
    const len = sortedRatings.length;
    if (len === 0) return 0;

    const mid = Math.floor(len / 2);

    if (len % 2 === 0) {
      const left = sortedRatings[mid - 1] ?? 0;
      const right = sortedRatings[mid] ?? 0;
      return (left + right) / 2;
    }

    return sortedRatings[mid] ?? 0;
  }
}

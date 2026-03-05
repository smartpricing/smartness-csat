import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
};

type MonthlyData = {
  year: number;
  month: number;
  feedback_count: number;
  average_rating: number;
  median_rating: number;
  pm_rating: number;
};

type QuarterlyData = {
  year: number;
  quarter: number;
  feedback_count: number;
  average_rating: number;
  median_rating: number;
  pm_rating: number;
};

export type FeedbackQuartersAnalyticsResponse = {
  monthly: MonthlyData[];
  quarterly: QuarterlyData[];
};

export class FeedbackQuartersAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<FeedbackQuartersAnalyticsResponse> {
    const { productKey, featureKey } = params;

    const monthlyResult = await this._postgresClient.client.query<{
      year: number;
      month: number;
      feedback_count: string;
      average_rating: string;
      positive_count: string;
      ratings: number[];
    }>(
      `SELECT
         EXTRACT(YEAR FROM uf.created_at)::INTEGER AS year,
         EXTRACT(MONTH FROM uf.created_at)::INTEGER AS month,
         COUNT(*)::TEXT AS feedback_count,
         AVG(uf.rating)::TEXT AS average_rating,
         COUNT(*) FILTER (WHERE uf.rating > 5)::TEXT AS positive_count,
         ARRAY_AGG(uf.rating ORDER BY uf.rating) AS ratings
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      [productKey, featureKey],
    );

    const quarterlyResult = await this._postgresClient.client.query<{
      year: number;
      quarter: number;
      feedback_count: string;
      average_rating: string;
      positive_count: string;
      ratings: number[];
    }>(
      `SELECT
         EXTRACT(YEAR FROM uf.created_at)::INTEGER AS year,
         EXTRACT(QUARTER FROM uf.created_at)::INTEGER AS quarter,
         COUNT(*)::TEXT AS feedback_count,
         AVG(uf.rating)::TEXT AS average_rating,
         COUNT(*) FILTER (WHERE uf.rating > 5)::TEXT AS positive_count,
         ARRAY_AGG(uf.rating ORDER BY uf.rating) AS ratings
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2
       GROUP BY year, quarter
       ORDER BY year DESC, quarter DESC`,
      [productKey, featureKey],
    );

    return {
      monthly: monthlyResult.rows.map((row) => {
        const total = Number.parseInt(row.feedback_count, 10);
        const positive = Number.parseInt(row.positive_count, 10);
        return {
          year: row.year,
          month: row.month,
          feedback_count: total,
          average_rating: Number.parseFloat(Number.parseFloat(row.average_rating).toFixed(2)),
          median_rating: this._calculateMedian(row.ratings),
          pm_rating: total > 0 ? Number.parseFloat((positive / total).toFixed(2)) : 0,
        };
      }),
      quarterly: quarterlyResult.rows.map((row) => {
        const total = Number.parseInt(row.feedback_count, 10);
        const positive = Number.parseInt(row.positive_count, 10);
        return {
          year: row.year,
          quarter: row.quarter,
          feedback_count: total,
          average_rating: Number.parseFloat(Number.parseFloat(row.average_rating).toFixed(2)),
          median_rating: this._calculateMedian(row.ratings),
          pm_rating: total > 0 ? Number.parseFloat((positive / total).toFixed(2)) : 0,
        };
      }),
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

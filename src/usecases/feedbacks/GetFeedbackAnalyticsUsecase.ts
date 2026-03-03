import type { PostgresClient } from '../../clients/PostgresClient.js';

type GetFeedbackAnalyticsParams = {
  productKey?: string | undefined;
  featureKey?: string | undefined;
};

type QuarterlyAnalytics = {
  year: number;
  quarter: number;
  feedback_count: number;
  average_rating: number;
  median_rating: number;
};

type FeatureAnalytics = {
  product_key: string;
  feature_key: string;
  quarters: QuarterlyAnalytics[];
};

type GetFeedbackAnalyticsResponse = {
  data: FeatureAnalytics[];
};

export class GetFeedbackAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: GetFeedbackAnalyticsParams): Promise<GetFeedbackAnalyticsResponse> {
    const conditions: string[] = [];
    const queryParams: (string | undefined)[] = [];
    let paramIndex = 1;

    if (params.productKey) {
      conditions.push(`pf.product_key = $${paramIndex}`);
      queryParams.push(params.productKey);
      paramIndex++;
    }

    if (params.featureKey) {
      conditions.push(`pf.key = $${paramIndex}`);
      queryParams.push(params.featureKey);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this._postgresClient.client.query<{
      product_key: string;
      feature_key: string;
      year: number;
      quarter: number;
      feedback_count: string;
      average_rating: string;
      ratings: number[];
    }>(
      `SELECT
         pf.product_key,
         pf.key AS feature_key,
         EXTRACT(YEAR FROM uf.created_at)::INTEGER AS year,
         EXTRACT(QUARTER FROM uf.created_at)::INTEGER AS quarter,
         COUNT(*)::TEXT AS feedback_count,
         AVG(uf.rating)::TEXT AS average_rating,
         ARRAY_AGG(uf.rating ORDER BY uf.rating) AS ratings
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       ${whereClause}
       GROUP BY pf.product_key, pf.key, year, quarter
       ORDER BY pf.product_key, pf.key, year DESC, quarter DESC`,
      queryParams,
    );

    const featureMap = new Map<string, FeatureAnalytics>();

    for (const row of result.rows) {
      const key = `${row.product_key}:${row.feature_key}`;

      if (!featureMap.has(key)) {
        featureMap.set(key, {
          product_key: row.product_key,
          feature_key: row.feature_key,
          quarters: [],
        });
      }

      const feature = featureMap.get(key);
      if (feature) {
        feature.quarters.push({
          year: row.year,
          quarter: row.quarter,
          feedback_count: Number.parseInt(row.feedback_count, 10),
          average_rating: Number.parseFloat(Number.parseFloat(row.average_rating).toFixed(2)),
          median_rating: this._calculateMedian(row.ratings),
        });
      }
    }

    return {
      data: Array.from(featureMap.values()),
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

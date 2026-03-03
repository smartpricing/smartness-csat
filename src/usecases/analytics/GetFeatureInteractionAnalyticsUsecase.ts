import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
};

type UserRow = {
  user_email: string;
  interaction_count: number;
  total_interaction_count: number;
  rejection_count: number;
  should_request_feedback: boolean;
  latest_user_agent: string | null;
  updated_at: string;
};

type Summary = {
  total_users: number;
  users_with_interactions: number;
  avg_total_interactions: number;
  max_total_interactions: number;
  users_pending_feedback: number;
  users_rejection_exhausted: number;
};

export type GetFeatureInteractionAnalyticsResponse = {
  summary: Summary;
  users: UserRow[];
};

export class GetFeatureInteractionAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<GetFeatureInteractionAnalyticsResponse> {
    const { productKey, featureKey } = params;

    const result = await this._postgresClient.client.query<
      UserRow & { interaction_threshold: number; rejection_threshold: number }
    >(
      `SELECT
         ufi.user_email,
         ufi.interaction_count,
         ufi.total_interaction_count,
         ufi.rejection_count,
         ufi.latest_user_agent,
         ufi.updated_at::text,
         pf.interaction_threshold,
         pf.rejection_threshold,
         (ufi.interaction_count >= pf.interaction_threshold AND ufi.rejection_count < pf.rejection_threshold)
           AS should_request_feedback
       FROM csat.user_feature_interaction ufi
       JOIN csat.product_feature pf
         ON pf.id = ufi.product_feature_id
       WHERE pf.product_key = $1
         AND pf.key = $2
       ORDER BY ufi.total_interaction_count DESC`,
      [productKey, featureKey],
    );

    const rows = result.rows;

    const summary: Summary = {
      total_users: rows.length,
      users_with_interactions: rows.filter((r) => r.total_interaction_count > 0).length,
      avg_total_interactions:
        rows.length > 0
          ? Math.round(
              rows.reduce((sum, r) => sum + r.total_interaction_count, 0) / rows.length,
            )
          : 0,
      max_total_interactions: rows.length > 0 ? rows[0]!.total_interaction_count : 0,
      users_pending_feedback: rows.filter((r) => r.should_request_feedback).length,
      users_rejection_exhausted: rows.filter(
        (r) => r.rejection_count >= r.rejection_threshold,
      ).length,
    };

    return {
      summary,
      users: rows.map((r) => ({
        user_email: r.user_email,
        interaction_count: r.interaction_count,
        total_interaction_count: r.total_interaction_count,
        rejection_count: r.rejection_count,
        should_request_feedback: r.should_request_feedback,
        latest_user_agent: r.latest_user_agent,
        updated_at: r.updated_at,
      })),
    };
  }
}

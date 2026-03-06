import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
  limit: number;
  cursor?: string | undefined;
};

type UserInteractionItem = {
  id: string;
  user_email: string;
  interaction_count: number;
  total_interaction_count: number;
  rejection_count: number;
  should_request_feedback: boolean;
  created_at: string;
  updated_at: string;
};

export type InteractionUsersAnalyticsResponse = {
  data: UserInteractionItem[];
  next_cursor: string | null;
  has_more: boolean;
};

export class InteractionUsersAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<InteractionUsersAnalyticsResponse> {
    const { productKey, featureKey, limit, cursor } = params;
    const fetchLimit = limit + 1;

    let cursorCondition = '';
    const queryParams: (string | number)[] = [productKey, featureKey, fetchLimit];

    if (cursor) {
      const decoded = this._decodeCursor(cursor);
      if (decoded) {
        cursorCondition = `AND (ufi.updated_at, ufi.id) < ($4, $5)`;
        queryParams.push(decoded.updated_at, decoded.id);
      }
    }

    const result = await this._postgresClient.client.query<{
      id: string;
      user_email: string;
      interaction_count: number;
      total_interaction_count: number;
      rejection_count: number;
      interaction_threshold: number;
      rejection_threshold: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         ufi.id,
         ufi.user_email,
         ufi.interaction_count,
         ufi.total_interaction_count,
         ufi.rejection_count,
         pf.interaction_threshold,
         pf.rejection_threshold,
         ufi.created_at,
         ufi.updated_at
       FROM csat.user_feature_interaction ufi
       JOIN csat.product_feature pf ON pf.id = ufi.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2
       ${cursorCondition}
       ORDER BY ufi.updated_at DESC, ufi.id DESC
       LIMIT $3`,
      queryParams,
    );

    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this._encodeCursor(lastItem.updated_at.toISOString(), lastItem.id)
        : null;

    return {
      data: items.map((row) => ({
        id: row.id,
        user_email: row.user_email,
        interaction_count: row.interaction_count,
        total_interaction_count: row.total_interaction_count,
        rejection_count: row.rejection_count,
        should_request_feedback:
          row.interaction_count >= row.interaction_threshold &&
          row.rejection_count < row.rejection_threshold,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  private _encodeCursor(updatedAt: string, id: string): string {
    return Buffer.from(JSON.stringify({ updated_at: updatedAt, id })).toString('base64');
  }

  private _decodeCursor(cursor: string): { updated_at: string; id: string } | null {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      if (decoded.updated_at && decoded.id) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }
}

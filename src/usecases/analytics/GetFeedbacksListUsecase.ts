import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
  limit: number;
  cursor?: string | undefined;
};

type FeedbackItem = {
  id: string;
  user_email: string;
  rating: number;
  comment: string | null;
  source: string;
  user_agent: string | null;
  created_at: string;
};

export type GetFeedbacksListResponse = {
  data: FeedbackItem[];
  next_cursor: string | null;
  has_more: boolean;
};

export class GetFeedbacksListUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<GetFeedbacksListResponse> {
    const { productKey, featureKey, limit, cursor } = params;
    const fetchLimit = limit + 1;

    let cursorCondition = '';
    const queryParams: (string | number)[] = [productKey, featureKey, fetchLimit];

    if (cursor) {
      const decoded = this._decodeCursor(cursor);
      if (decoded) {
        cursorCondition = `AND (uf.created_at, uf.id) < ($4, $5)`;
        queryParams.push(decoded.created_at, decoded.id);
      }
    }

    const result = await this._postgresClient.client.query<{
      id: string;
      user_email: string;
      rating: number;
      comment: string | null;
      source: string;
      user_agent: string | null;
      created_at: Date;
    }>(
      `SELECT
         uf.id,
         uf.user_email,
         uf.rating,
         uf.comment,
         uf.source,
         uf.user_agent,
         uf.created_at
       FROM csat.user_feedback uf
       JOIN csat.product_feature pf ON pf.id = uf.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2
       ${cursorCondition}
       ORDER BY uf.created_at DESC, uf.id DESC
       LIMIT $3`,
      queryParams,
    );

    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this._encodeCursor(lastItem.created_at.toISOString(), lastItem.id)
        : null;

    return {
      data: items.map((row) => ({
        id: row.id,
        user_email: row.user_email,
        rating: row.rating,
        comment: row.comment,
        source: row.source,
        user_agent: row.user_agent,
        created_at: row.created_at.toISOString(),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  private _encodeCursor(createdAt: string, id: string): string {
    return Buffer.from(JSON.stringify({ created_at: createdAt, id })).toString('base64');
  }

  private _decodeCursor(cursor: string): { created_at: string; id: string } | null {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      if (decoded.created_at && decoded.id) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }
}

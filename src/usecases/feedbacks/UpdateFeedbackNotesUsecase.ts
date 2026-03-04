import type { PostgresClient } from '../../clients/PostgresClient.js';

type UpdateFeedbackNotesParams = {
  feedbackId: string;
  notes: string | null;
  updatedBy: string;
};

export type UpdateFeedbackNotesResponse = {
  id: string;
  notes: string | null;
  notes_updated_by: string | null;
  notes_updated_at: string | null;
};

export class UpdateFeedbackNotesUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: UpdateFeedbackNotesParams): Promise<UpdateFeedbackNotesResponse> {
    const { feedbackId, notes, updatedBy } = params;

    const result = await this._postgresClient.client.query<{
      id: string;
      notes: string | null;
      notes_updated_by: string | null;
      notes_updated_at: Date | null;
    }>(
      `UPDATE csat.user_feedback
       SET notes = $2,
           notes_updated_by = $3,
           notes_updated_at = NOW()
       WHERE id = $1
       RETURNING id, notes, notes_updated_by, notes_updated_at`,
      [feedbackId, notes, updatedBy],
    );

    if (result.rowCount === 0) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    const row = result.rows[0]!;

    return {
      id: row.id,
      notes: row.notes,
      notes_updated_by: row.notes_updated_by,
      notes_updated_at: row.notes_updated_at?.toISOString() ?? null,
    };
  }
}

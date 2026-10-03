MeduPro release

Applied in order: social-games.sql, classic-duels.sql, match-energy-rewards.sql, duel-actions.sql.

The original diji-api Edge Function remains unchanged. medupro-api verifies the existing hashed portal session, binds all RPC actors to that session, and requires an approved student. Direct client access to the new tables and RPCs is revoked.

Database tests run inside a transaction ending in ROLLBACK. No test students remain.

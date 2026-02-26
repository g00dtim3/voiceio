import { Pool } from "pg";

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://voiceio:voiceio_dev@localhost:5432/voiceio_dev",
});

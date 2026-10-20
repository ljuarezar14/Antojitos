-- PINs are now checked by the server, which opens a session per device.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Wrong PINs per user, to lock the login for a few minutes after repeated failures.
CREATE TABLE IF NOT EXISTS login_failures (
  user_id TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

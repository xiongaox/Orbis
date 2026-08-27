CREATE TABLE IF NOT EXISTS case_entries (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('bazi', 'qimen')),
  author_key TEXT NOT NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_entries_domain_category_title
  ON case_entries (domain, category, title);
CREATE INDEX IF NOT EXISTS idx_case_entries_author_domain
  ON case_entries (author_key, domain);

CREATE TABLE IF NOT EXISTS case_author_profiles (
  author_key TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

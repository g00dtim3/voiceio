-- PostgreSQL MVP schema (code-gen ready)
create extension if not exists pgcrypto;

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table dataset_rows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  row_index bigint not null,
  text_to_analyze jsonb not null default '{}'::jsonb,  -- {colId: text}
  aux_values jsonb not null default '{}'::jsonb,      -- {colId: value}
  translated_text jsonb not null default '{}'::jsonb, -- optional translations
  duplicates_group_key text,                          -- hash of translated text (optional)
  created_at timestamptz not null default now()
);

create unique index dataset_rows_project_row_index_uq on dataset_rows(project_id, row_index);
create index dataset_rows_project_aux_gin on dataset_rows using gin (aux_values);
create index dataset_rows_project_tta_gin on dataset_rows using gin (text_to_analyze);
create index dataset_rows_project_dupes_idx on dataset_rows(project_id, duplicates_group_key);

create table topic_collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  text_column_id text not null,
  language text not null default 'en',
  sentiment_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index topic_collections_unique on topic_collections(project_id, text_column_id);

create table topic_categories (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references topic_collections(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references topic_categories(id) on delete cascade,
  label text not null,
  description text,
  sentiment_enabled boolean not null default false,
  sentiment_labels jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create table topic_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  row_id uuid not null references dataset_rows(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  sentiment text, -- positive|neutral|negative|null
  source text not null default 'ai', -- ai|human
  reviewed boolean not null default false,
  confidence numeric(5,4),
  created_at timestamptz not null default now()
);
create index topic_assignments_project_row_idx on topic_assignments(project_id, row_id);
create index topic_assignments_topic_idx on topic_assignments(topic_id);

create table smart_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  output_type text not null, -- text|number|boolean|date|json
  compute_type text not null, -- mapping|formula|llm
  source_columns jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft', -- draft|idle|running|completed|failed|outdated
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table smart_column_values (
  id uuid primary key default gen_random_uuid(),
  smart_column_id uuid not null references smart_columns(id) on delete cascade,
  row_id uuid not null references dataset_rows(id) on delete cascade,
  value jsonb,
  confidence numeric(5,4),
  computed_at timestamptz not null default now()
);
create unique index smart_column_values_uq on smart_column_values(smart_column_id, row_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table report_views (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  name text not null,
  filters jsonb not null default '[]'::jsonb,
  segments jsonb not null default '[]'::jsonb,
  date_range jsonb,
  sort_order int not null default 0
);

create table report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create table insight_elements (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references report_sections(id) on delete cascade,
  type text not null,
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create table report_share_settings (
  report_id uuid primary key references reports(id) on delete cascade,
  public_enabled boolean not null default false,
  embed_enabled boolean not null default false,
  password_hash text,
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  status text not null default 'queued', -- queued|running|succeeded|failed|canceled
  progress int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  result_ref text,
  error text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_project_status_idx on jobs(project_id, status);
create index jobs_dedupe_idx on jobs(project_id, type, dedupe_key);

-- Browser-scoped capability sessions. No names, emails or child profiles.
-- A 256-bit random token stays on the browser; only its SHA-256 is persisted.
create table public.workspaces (
 session_hash text primary key check (session_hash ~ '^[a-f0-9]{64}$'),
 atoms jsonb not null default '[]' check(jsonb_typeof(atoms)='array' and jsonb_array_length(atoms)<=24 and octet_length(atoms::text)<24000),
 updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from anon, authenticated;
grant select, insert, update on public.workspaces to anon;
create policy "Browser owns workspace" on public.workspaces for all to anon
 using (
 length(current_setting('request.headers',true)::json->>'x-molecule-session')=64
 and session_hash=encode(sha256(convert_to(current_setting('request.headers',true)::json->>'x-molecule-session','UTF8')),'hex')
 )
 with check (
 (current_setting('request.headers',true)::json->>'x-molecule-session') ~ '^[a-f0-9]{64}$'
 and session_hash=encode(sha256(convert_to(current_setting('request.headers',true)::json->>'x-molecule-session','UTF8')),'hex')
 );

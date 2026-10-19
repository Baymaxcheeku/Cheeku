-- Shows which migrations your database already has. Paste, Run, and look at the list.
-- This only lists migrations run with npm run db:migrate. Steps pasted into the
-- SQL editor are not recorded here; for 0031 to 0034 use 0031-0034-check.sql,
-- which looks at the tables and functions themselves.
select filename from schema_migrations order by filename;

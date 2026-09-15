-- Hand-edited from what drizzle-kit generated, which was a bare
--     ALTER TABLE "admin_users" ADD COLUMN "role" varchar NOT NULL;
-- That fails against a table that already has rows: the column has no
-- server default (deliberately — every table in this schema keeps its
-- defaults app-side, in $defaultFn), so the existing rows would have
-- nothing to put in it. Add it nullable, backfill, then constrain.
--
-- Backfilling to 'admin' preserves exactly the behaviour those rows have
-- today, since before this column existed every account was a full
-- administrator. Deciding WHICH of them should be analytics-only is an
-- operational choice about particular people, not a schema change, so it
-- is not encoded here.
ALTER TABLE "admin_users" ADD COLUMN "role" varchar;
--> statement-breakpoint
UPDATE "admin_users" SET "role" = 'admin' WHERE "role" IS NULL;
--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "role" SET NOT NULL;

CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"must_change_password" boolean NOT NULL,
	"active" boolean NOT NULL,
	"created_at" varchar NOT NULL,
	"last_login_at" varchar
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ix_admin_users_email" ON "admin_users" USING btree ("email");
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"role" varchar NOT NULL,
	"must_change_password" boolean NOT NULL,
	"created_at" varchar NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

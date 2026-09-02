CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"event_type" varchar NOT NULL,
	"poi_id" varchar,
	"category" varchar,
	"search_query" varchar,
	"lat" double precision,
	"lon" double precision,
	"device_id" varchar,
	"ip_address" varchar,
	"created_at" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_flags" (
	"id" varchar PRIMARY KEY NOT NULL,
	"device_id" varchar NOT NULL,
	"ip_address" varchar,
	"event_count" integer NOT NULL,
	"window_minutes" integer NOT NULL,
	"sample_queries" varchar,
	"flagged_at" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" varchar PRIMARY KEY NOT NULL,
	"rating_navigation" integer NOT NULL,
	"rating_info_accuracy" integer NOT NULL,
	"rating_overall" integer NOT NULL,
	"comment" varchar,
	"created_at" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" varchar PRIMARY KEY NOT NULL,
	"url" varchar NOT NULL,
	"original_filename" varchar NOT NULL,
	"uploaded_at" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pois" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"name_te" varchar,
	"name_hi" varchar,
	"category" varchar NOT NULL,
	"facility_type" varchar,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"description" varchar,
	"description_te" varchar,
	"description_hi" varchar,
	"search_terms" varchar,
	"opening_hours" varchar,
	"opening_hours_te" varchar,
	"opening_hours_hi" varchar,
	"closed_override" boolean NOT NULL,
	"accessible" boolean NOT NULL,
	"gender" varchar,
	"capacity_note" varchar,
	"capacity_note_te" varchar,
	"capacity_note_hi" varchar,
	"photo_url" varchar,
	"maps_url" varchar,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_places" (
	"id" varchar PRIMARY KEY NOT NULL,
	"poi_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"name_te" varchar,
	"name_hi" varchar,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"maps_url" varchar,
	"gender" varchar,
	"sort_order" integer NOT NULL,
	"photo_url" varchar,
	"search_terms" varchar
);
--> statement-breakpoint
ALTER TABLE "sub_places" ADD CONSTRAINT "sub_places_poi_id_pois_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."pois"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_analytics_events_event_type" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "ix_analytics_events_poi_id" ON "analytics_events" USING btree ("poi_id");--> statement-breakpoint
CREATE INDEX "ix_analytics_events_category" ON "analytics_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ix_analytics_events_device_id" ON "analytics_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "ix_analytics_events_created_at" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_device_flags_device_id" ON "device_flags" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "ix_device_flags_flagged_at" ON "device_flags" USING btree ("flagged_at");--> statement-breakpoint
CREATE INDEX "ix_feedback_created_at" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_pois_category" ON "pois" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ix_pois_facility_type" ON "pois" USING btree ("facility_type");--> statement-breakpoint
CREATE INDEX "ix_sub_places_poi_id" ON "sub_places" USING btree ("poi_id");
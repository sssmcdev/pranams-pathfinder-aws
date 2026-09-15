/**
 * The one password rule the browser also needs to know, split out from
 * lib/admin-users.ts because that module is server-only — importing it
 * from a client component would pull the database client into the browser
 * bundle and fail the build.
 *
 * lib/admin-users.ts re-exports this as MIN_PASSWORD_LENGTH so the server
 * validation and the form's minLength can never drift apart.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * The two access tiers, here rather than in lib/admin-users.ts for the
 * same reason as the length above: that module is server-only, and the
 * /admin/admins form needs these labels in the browser. admin-users.ts
 * re-exports them and owns the validation; lib/session.ts owns the
 * enforcing.
 */
export const ROLES = ["admin", "analytics"] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Administrator",
  analytics: "Analytics only",
};

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

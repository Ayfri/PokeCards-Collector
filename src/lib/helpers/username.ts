/** Mirrors the `profiles_username_format` check constraint, so the forms and endpoints reject what the database would. */
export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

export const USERNAME_REQUIREMENTS = 'Username must be 3 to 20 characters long and can only contain letters, numbers, underscores and hyphens.';

/** Usernames are stored trimmed and lowercased. */
export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

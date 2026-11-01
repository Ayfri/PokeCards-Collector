export const POKEMONS_COUNT = 1025;
export const BASE_URL = 'https://pokecards-collector.ayfri.com';
export const SITE_NAME = 'PokéCards-Collector';
/** Credited as `twitter:site` / `twitter:creator`, which is what turns a shared link into an attributed X card. */
export const SITE_TWITTER = '@ayfri_';

/** Mirrors the `profiles_username_format` check constraint, so the forms and endpoints reject what the database would. */
export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

export const USERNAME_REQUIREMENTS = 'Username must be 3 to 20 characters long and can only contain letters, numbers, underscores and hyphens.';

/** Usernames are stored trimmed and lowercased. */
export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

/** The rules a password must satisfy, in the order the forms list them, so the browser hints and the server checks cannot drift apart. */
export const PASSWORD_CRITERIA = [
	{ id: 'length', label: 'At least 8 characters', test: (password: string) => password.length >= 8 },
	{ id: 'digit', label: 'At least one number', test: (password: string) => /[0-9]/.test(password) },
	{ id: 'special', label: 'At least one special character', test: (password: string) => /[^a-zA-Z0-9]/.test(password) },
] as const;

export const PASSWORD_REQUIREMENTS = 'Password must be at least 8 characters long and include at least one number and one special character.';

export const isStrongPassword = (password: string): boolean => PASSWORD_CRITERIA.every(criterion => criterion.test(password));

/** Dark form styling shared by the auth forms and the password field, as class strings because Tailwind scans the sources and not the CSS. */
export const FORM_LABEL_CLASS = 'mb-1 block text-sm font-medium text-gray-300';
export const FORM_INPUT_CLASS = 'w-full rounded-md border border-gray-700/60 bg-gray-900/50 px-3 py-2 text-white placeholder-gray-500 focus:border-gold-400 focus:outline-hidden';
export const GOLD_BUTTON_CLASS = 'flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 px-4 py-2 font-bold text-black transition-colors duration-300 hover:bg-gold-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50';

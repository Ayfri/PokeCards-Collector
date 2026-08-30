/** The rules a password must satisfy, in the order the forms list them, so the browser hints and the server checks cannot drift apart. */
export const PASSWORD_CRITERIA = [
	{ id: 'length', label: 'At least 8 characters', test: (password: string) => password.length >= 8 },
	{ id: 'digit', label: 'At least one number', test: (password: string) => /[0-9]/.test(password) },
	{ id: 'special', label: 'At least one special character', test: (password: string) => /[^a-zA-Z0-9]/.test(password) },
] as const;

export const PASSWORD_REQUIREMENTS = 'Password must be at least 8 characters long and include at least one number and one special character.';

export const isStrongPassword = (password: string): boolean => PASSWORD_CRITERIA.every(criterion => criterion.test(password));

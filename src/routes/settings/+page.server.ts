import type { PageServerLoad } from './$types';

export const load = (async () => {
	return {
		meta: {
			title: 'Settings - PokéCards-Collector',
			description: 'Manage your profile and application settings.'
		}
	};
}) satisfies PageServerLoad;

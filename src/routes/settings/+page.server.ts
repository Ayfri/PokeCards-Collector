import type { PageServerLoad } from './$types';

export const load = (async () => {
  return {
    title: 'Settings - PokeStore',
    description: 'Manage your account settings and preferences',
    image: {
      url: '/images/settings-banner.jpg',
      alt: 'Settings Banner'
    }
  };
}) satisfies PageServerLoad; 
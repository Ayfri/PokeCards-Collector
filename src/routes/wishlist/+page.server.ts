import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => redirect(302, locals.profile ? `/wishlist/${encodeURIComponent(locals.profile.username)}` : '/');

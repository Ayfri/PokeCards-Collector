import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw redirect(303, '/');
	}

	const { data: profileData, error } = await supabase
		.from('profiles')
		.select(`auth_id, username, avatar_url, profile_color, is_public, created_at, updated_at`)
		.eq('auth_id', user.id)
		.single();

	if (error) {
		console.error('Error fetching profile:', error);
		return {
			user,
			profile: null
		};
	}

	return {
		user,
		profile: profileData
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const profileColor = formData.get('profile_color') as string;

		if (!/^#[0-9A-Fa-f]{6}$/.test(profileColor)) {
			return fail(400, {
				profileColor,
				error: 'Invalid hex color format. Please use #RRGGBB.',
				success: false
			});
		}

		const { error } = await supabase
			.from('profiles')
			.update({ profile_color: profileColor })
			.eq('auth_id', user.id);

		if (error) {
			console.error('Error updating profile color:', error);
			return fail(500, {
				profileColor,
				error: 'Server error. Could not update profile color.',
				success: false
			});
		}

		return {
			success: true,
			message: 'Profile color updated successfully!',
			profileColor
		};
	}
};

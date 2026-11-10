import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		throw redirect(303, '/');
	}

	const { data: profileData, error } = await supabase
		.from('profiles')
		.select(`auth_id, username, profile_color, is_public, created_at, updated_at`)
		.eq('auth_id', user.id)
		.single();

	if (error) {
		console.error('Error fetching profile:', error);
		return {
			noindex: true,
			profile: null,
			user
		};
	}

	return {
		description: 'Manage your PokéCards-Collector account: username, profile colour and collection visibility.',
		noindex: true,
		profile: profileData,
		title: 'Settings',
		user
	};
};

export const actions: Actions = {
	updateProfile: async ({ locals: { supabase, user }, request }) => {
		if (!user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const profileColor = formData.get('profile_color') as string;

		if (!/^#[0-9A-Fa-f]{6}$/.test(profileColor)) {
			return fail(400, {
				error: 'Invalid hex color format. Please use #RRGGBB.',
				profileColor,
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
				error: 'Server error. Could not update profile color.',
				profileColor,
				success: false
			});
		}

		return {
			message: 'Profile color updated successfully!',
			profileColor,
			success: true
		};
	},

	updateVisibility: async ({ locals: { supabase, user }, request }) => {
		if (!user) {
			throw redirect(303, '/');
		}

		const isPublic = (await request.formData()).get('is_public') === 'true';
		const { error } = await supabase.from('profiles').update({ is_public: isPublic }).eq('auth_id', user.id);

		if (error) {
			console.error('Error updating profile visibility:', error);
			return fail(500, { visibilityError: 'Server error. Could not update your profile visibility.' });
		}

		return { visibilityMessage: `Your profile is now ${isPublic ? 'public' : 'private'}.` };
	}
};

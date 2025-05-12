import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
    if (!locals.profile) {
        return redirect(302, '/');
    }

    return redirect(302, `/collection/${encodeURIComponent(locals.profile.username)}`);
}

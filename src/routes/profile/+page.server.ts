import { redirect } from "@sveltejs/kit";

export const load = async ({ locals }) => {
    if (!locals.profile) {
        return redirect(302, '/');
    }

    return redirect(302, `/profile/${encodeURIComponent(locals.profile.username)}`);
}
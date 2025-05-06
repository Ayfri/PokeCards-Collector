import { json } from '@sveltejs/kit';
import { searchUsers } from '$lib/services/profiles';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q') || '';
	const limit = parseInt(url.searchParams.get('limit') || '10', 10);
	
	const { data, error } = await searchUsers(query, limit);
	
	if (error) {
		console.error('Search users API error:', error);
		return json({ 
			success: false, 
			error: typeof error === 'object' ? JSON.stringify(error) : String(error) 
		}, { status: 500 });
	}
	
	return json({
		success: true,
		users: data || []
	});
}; 
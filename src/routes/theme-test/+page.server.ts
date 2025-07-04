// Empty server-side load function to bypass Supabase errors
export async function load() {
	return {
		allCards: [],
		prices: {},
		sets: [],
		user: null,
		profile: null,
		wishlistItems: [],
		collectionItems: []
	};
}
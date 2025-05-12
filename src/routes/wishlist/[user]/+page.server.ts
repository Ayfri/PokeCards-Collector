import { error, redirect } from '@sveltejs/kit';
import { getCards, getPokemons, getSets, getRarities, getTypes, getPrices, getArtists } from '$helpers/data';
import { getUserWishlist } from '$lib/services/wishlists';
import { getProfileByUsername } from '$lib/services/profiles';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const requestedUsername = params.user;
	const loggedInUserProfile = locals.profile;

	// If not ?user=... and logged in, redirect to ?user=username
	if (!requestedUsername && loggedInUserProfile?.username) {
		const correctUrl = `/wishlist/${encodeURIComponent(loggedInUserProfile.username)}`;
		throw redirect(307, correctUrl);
	}

	// --- Always load base data --- 
	const [allCards, pokemons, sets, rarities, types, prices, artists] = await Promise.all([
		getCards(),
		getPokemons(),
		getSets(),
		getRarities(),
		getTypes(),
		getPrices(),
		getArtists()
	]).catch(e => {
		console.error("Error loading global card data:", e);
		throw error(500, 'Failed to load necessary card data');
	});
	// --- End base data loading ---

	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = null;
	let isPublic = false;
	let wishlistCards: FullCard[] | null = null;
	let title = 'Wishlist';
	let description = 'User wishlist';
	let profileError: any = null;

	// --- Viewing a specific user's wishlist --- 
	targetUsername = requestedUsername;
	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
		console.error(`Error fetching profile or profile not found for ${targetUsername}:`, profileError);
		targetProfile = null;
		title = 'User Not Found';
		description = `Wishlist for user ${targetUsername} could not be found or user does not exist.`;
	} else {
		// --- Profile Found - Check Casing and Redirect if needed --- 
		if (targetProfile.username !== targetUsername) {
			const correctUrl = `/wishlist/${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}
		// --- End Casing Check --- 
		targetUsername = targetProfile.username;
		isPublic = targetProfile.is_public;

		if (isPublic || (loggedInUserProfile && loggedInUserProfile.username === targetProfile.username)) {
			// Fetch wishlist if public OR if the logged-in user is viewing their own profile
			const { data: wishlistItems, error: wishlistError } = await getUserWishlist(targetProfile.username);
			if (wishlistError) {
				console.error(`Error fetching wishlist for ${targetProfile.username}:`, wishlistError);
			} else {
				const wishlistCardCodes = new Set(wishlistItems?.map(item => item.card_code) || []);
				wishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
			}
			title = `${targetProfile.username}'s Wishlist`;
			description = `Pokémon TCG wishlist for user ${targetProfile.username}.`;
		} else {
			// Profile is private and not owned by viewer
			title = 'Private Wishlist';
			description = `This user's wishlist is private.`;
		}
	}
	// --- End viewing specific user's wishlist ---

	// If connected with own profile, change title and description
	if (loggedInUserProfile && loggedInUserProfile.username === targetUsername) {
		title = 'My Wishlist';
		description = 'Your Pokémon TCG card wishlist.';
	}

	// At the end, always use favicon.png as Open Graph image
	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		// Base data
		allCards, pokemons, sets, rarities, types, prices, artists,
		// User/Wishlist specific data
		targetProfile,
		isPublic,
		serverWishlistCards: wishlistCards,
		targetUsername,
		title,
		description,
		image: ogImage,
	};
}; 
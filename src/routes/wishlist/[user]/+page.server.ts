import { error, redirect } from '@sveltejs/kit';
import { getPokemons, getRarities, getTypes, getArtists } from '$helpers/data';
import { getProfileByUsername } from '$lib/services/profiles';
import { getUserWishlist } from '$lib/services/wishlists';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile, UserWishlist } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { allCards, sets, prices, profile: loggedInUserProfile, wishlistItems: layoutWishlistItems, ...layoutData } = await parent();
	const requestedUsername = params.user;

	// If not ?user=... and logged in, redirect to ?user=username
	if (!requestedUsername && loggedInUserProfile?.username) {
		const correctUrl = `/wishlist/${encodeURIComponent(loggedInUserProfile.username)}`;
		throw redirect(307, correctUrl);
	}

	// --- Load remaining base data ---
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]).catch(e => {
		console.error("Error loading page-specific card data:", e);
		throw error(500, 'Failed to load necessary card data for page');
	});
	// --- End base data loading ---

	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = null;
	let isPublic = false;
	let wishlistCards: FullCard[] | null = null;
	let title = 'Wishlist';
	let description = 'User wishlist';
	let profileError: any = null;

	targetUsername = requestedUsername;
	({ data: targetProfile, error: profileError } = await getProfileByUsername(targetUsername));

	if (profileError || !targetProfile) {
		console.error(`Error fetching profile or profile not found for ${targetUsername}:`, profileError);
		targetProfile = null;
		title = 'User Not Found';
		description = `Wishlist for user ${targetUsername} could not be found or user does not exist.`;
	} else {
		if (targetProfile.username !== targetUsername) {
			const correctUrl = `/wishlist/${encodeURIComponent(targetProfile.username)}`;
			throw redirect(307, correctUrl);
		}
		targetUsername = targetProfile.username;
		isPublic = targetProfile.is_public;

		if (isPublic || (loggedInUserProfile && loggedInUserProfile.username === targetProfile.username)) {
			let itemsToProcess: Array<{ card_code: string }> | undefined | null = layoutWishlistItems as Array<{ card_code: string }> | undefined | null;

			// If viewing another user's public profile, fetch their wishlist items
			if (isPublic && loggedInUserProfile?.username !== targetProfile.username && targetProfile) {
				const { data: targetUserWishlistItems, error: wishlistError } = await getUserWishlist(targetProfile.username);
				if (wishlistError) {
					console.error(`Error fetching wishlist for ${targetProfile.username}:`, wishlistError);
					itemsToProcess = [];
				} else {
					itemsToProcess = targetUserWishlistItems;
				}
			} else if (loggedInUserProfile && loggedInUserProfile.username === targetProfile?.username) {
				// Viewing own wishlist, use layout data
				itemsToProcess = layoutWishlistItems as Array<{ card_code: string }> | undefined | null;
			} else if (!isPublic && !(loggedInUserProfile && loggedInUserProfile.username === targetProfile?.username)) {
				// Private profile and not the owner
				itemsToProcess = [];
			}

			if (itemsToProcess) {
				const wishlistCardCodes = new Set(itemsToProcess.map(item => item.card_code));
				wishlistCards = allCards.filter(card => wishlistCardCodes.has(card.cardCode));
			} else {
				wishlistCards = [];
			}
			title = `${targetProfile.username}'s Wishlist`;
			description = `Pokémon TCG wishlist for user ${targetProfile.username}.`;
		} else {
			title = 'Private Wishlist';
			description = `This user's wishlist is private.`;
		}
	}

	if (loggedInUserProfile && loggedInUserProfile.username === targetUsername) {
		title = 'My Wishlist';
		description = 'Your Pokémon TCG card wishlist.';
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	return {
		...layoutData,
		allCards, pokemons, sets, rarities, types, prices, artists,
		targetProfile,
		isPublic,
		serverWishlistCards: wishlistCards,
		targetUsername,
		title,
		description,
		image: ogImage,
	};
};

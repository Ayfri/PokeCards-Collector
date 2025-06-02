import { error, redirect } from '@sveltejs/kit';
import { getPokemons, getRarities, getTypes, getArtists } from '$helpers/supabase-data';
import { getProfileByUsername } from '$lib/services/profiles';
import { getUserWishlist } from '$lib/services/wishlists';
import type { PageServerLoad } from './$types';
import type { FullCard, UserProfile, Set as TSet, PriceData } from '$lib/types';

async function getStreamedWishlistData(
	allCards: FullCard[],
	// prices: Record<string, PriceData>, // Prices not directly used for wishlist cards filtering, but kept for consistency if CardGrid expects it
	sets: TSet[],
	wishlistItemsSource: Array<{ card_code: string }> | undefined | null,
	targetProfileForWishlist: UserProfile | null,
	isPublicForWishlist: boolean,
	loggedInUsernameForWishlist: string | null
) {
	const [pokemons, rarities, types, artists] = await Promise.all([
		getPokemons(),
		getRarities(),
		getTypes(),
		getArtists()
	]).catch(e => {
		console.error("Error loading page-specific card data for wishlist:", e);
		throw new Error('Failed to load necessary card data for wishlist');
	});

	let wishlistCards: FullCard[] = [];
	let itemsToProcess = wishlistItemsSource;

	if (targetProfileForWishlist && isPublicForWishlist && loggedInUsernameForWishlist !== targetProfileForWishlist.username) {
		const { data: targetUserWishlistItems, error: wishlistError } = await getUserWishlist(targetProfileForWishlist.username);
		if (wishlistError) {
			console.error(`Error fetching wishlist for ${targetProfileForWishlist.username}:`, wishlistError);
			itemsToProcess = [];
		} else {
			itemsToProcess = targetUserWishlistItems;
		}
	}

	if (itemsToProcess) {
		const wishlistCardCodes = new Set(itemsToProcess.map(item => item.card_code));
		wishlistCards = allCards.filter((card: FullCard) => wishlistCardCodes.has(card.cardCode));
	} else {
		wishlistCards = [];
	}

	return {
		pokemons,
		sets,
		rarities,
		types,
		// prices, // Not returning prices from here as it's top-level now
		artists,
		serverWishlistCards: wishlistCards,
	};
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	const { profile: loggedInUserProfile, wishlistItems: layoutWishlistItems, sets: parentSets, ...layoutData } = parentData;

	const allCardsResolved = await parentData.streamed.allCards || [];
	const pricesResolved = await parentData.streamed.prices || {}; // Keep resolving prices for CardGrid
	const setsResolved = parentSets || [];

	const requestedUsername = params.user;

	// Redirect logic for /wishlist to /wishlist/[user] if logged in
	if (!requestedUsername && loggedInUserProfile?.username) {
		const correctUrl = `/wishlist/${encodeURIComponent(loggedInUserProfile.username)}`;
		throw redirect(307, correctUrl);
	}
	// If no requestedUsername and not logged in, it will proceed to show a generic state (handled by targetProfile being null)

	let targetProfile: UserProfile | null = null;
	let targetUsername: string | null = requestedUsername; // Can be null if /wishlist is accessed directly without user param and not logged in
	let isPublic = false;
	let title = 'Wishlist';
	let description = 'User wishlist';
	let profileError: any = null;

	if (targetUsername) { // Only try to fetch profile if a username is present
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
			targetUsername = targetProfile.username; // Use canonical username
			isPublic = targetProfile.is_public;

			if (isPublic || (loggedInUserProfile && loggedInUserProfile.username === targetProfile.username)) {
				title = `${targetProfile.username}'s Wishlist`;
				description = `Pokémon TCG wishlist for user ${targetProfile.username}.`;
			} else {
				title = 'Private Wishlist';
				description = `This user's wishlist is private.`;
			}
		}
	} else if (!loggedInUserProfile) {
		// No target user in URL, and not logged in: generic state
		title = 'View Wishlist';
		description = 'Log in to view or manage your wishlist, or search for a user.';
		// targetProfile remains null
	}


	if (loggedInUserProfile && targetProfile && loggedInUserProfile.username === targetProfile.username) {
		title = 'My Wishlist';
		description = 'Your Pokémon TCG card wishlist.';
	}

	const ogImage = { url: '/favicon.png', alt: 'PokéCards-Collector logo' };

	let wishlistSourceItems = null;
	if (targetProfile && loggedInUserProfile && loggedInUserProfile.username === targetProfile.username) {
		wishlistSourceItems = layoutWishlistItems as Array<{ card_code: string }> | undefined | null;
	} else if (targetProfile && isPublic) {
		wishlistSourceItems = null; // To be fetched by getStreamedWishlistData
	} else {
		wishlistSourceItems = [];
	}

	return {
		...layoutData,
		targetProfile,
		isPublic,
		targetUsername,
		title,
		description,
		image: ogImage,
		allCards: allCardsResolved,
		prices: pricesResolved,
		sets: setsResolved,
		streamed: {
			wishlistData: getStreamedWishlistData(
				allCardsResolved,
				// pricesResolved, // Not needed by getStreamedWishlistData itself
				setsResolved,
				wishlistSourceItems,
				targetProfile,
				isPublic,
				loggedInUserProfile?.username || null
			)
		}
	};
};

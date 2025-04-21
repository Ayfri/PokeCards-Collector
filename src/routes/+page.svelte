<script lang="ts">
	import CardGrid from '$lib/components/list/CardGrid.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { getUserWishlist } from '$lib/services/wishlists';

	export let data: PageData;

	// Use allCards from layout data passed down via PageData
	$: allCards = data.allCards;
	$: sets = data.sets;
	$: rarities = data.rarities;
	$: types = data.types;
	$: artists = data.artists;
	$: pokemons = data.pokemons;

	onMount(() => {
		const unsubscribe = authStore.subscribe(async (state) => {
			if (!state.loading) {
				if (state.profile) {
					// console.log('Auth state ready. Checking wishlist for user:', state.profile.username);
					const { data: wishlistItems, error } = await getUserWishlist(state.profile.username);
					if (error) {
						// console.error('Error fetching wishlist for logging:', error);
					} else {
						// console.log('User Wishlist Items:', wishlistItems);
					}
				} else {
					// console.log('Auth state ready. User not logged in, skipping wishlist log.');
				}
			}
		});
		return unsubscribe;
	});
</script>

<main class="max-lg:px-0 text-white text-lg flex flex-col flex-1 lg:-mt-8">
	<CardGrid cards={allCards} {sets} {rarities} {types} {artists} {pokemons} />
</main>

<style>
	:global(body) {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>

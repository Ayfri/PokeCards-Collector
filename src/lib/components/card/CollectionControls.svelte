<script lang="ts">
	import { page } from '$app/state';
	import { addCardToCollection, removeCardFromCollection } from '#lib/services/collections.ts';
	import { addCardToWishlist, removeCardFromWishlist } from '#lib/services/wishlists.ts';
	import { MAX_CARD_QUANTITY } from '#src/constants.ts';
	import { collection } from '#stores/collection.svelte.ts';
	import { wishlist } from '#stores/wishlist.svelte.ts';
	import Heart from '@lucide/svelte/icons/heart';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';

	interface Props {
		cardCode: string;
		/** Positions the controls inside their tile, the set badge owns the bottom-left corner. */
		class?: string;
		iconSize?: number;
		style?: string;
	}

	let { cardCode, class: classNames = '', iconSize = 16, style }: Props = $props();

	const user = $derived(page.data.user);
	const profile = $derived(page.data.profile);

	const count = $derived(collection.count(cardCode));
	const limitReached = $derived(count >= MAX_CARD_QUANTITY);
	const wishlisted = $derived(wishlist.has(cardCode));
	let updatingCollection = $state(false);
	let updatingWishlist = $state(false);

	/** The services never throw, they return their error, so the flags always come back down. */
	async function changeCopies(event: MouseEvent, change: typeof addCardToCollection | typeof removeCardFromCollection) {
		event.preventDefault();
		event.stopPropagation();
		if (!profile || updatingCollection) return;

		updatingCollection = true;
		await change(profile.username, cardCode);
		updatingCollection = false;
	}

	async function toggleWishlist(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!profile) return;

		updatingWishlist = true;
		await (wishlisted ? removeCardFromWishlist : addCardToWishlist)(profile.username, cardCode);
		updatingWishlist = false;
	}
</script>

{#if user && profile}
	<div class="absolute z-10 flex items-center gap-1 rounded-full bg-black/60 p-1 shadow-[0_2px_10px_rgb(0_0_0/0.6)] ring-1 ring-white/10 backdrop-blur-xs {classNames}" {style}>
		{#if count > 0}
			<button
				aria-label="Remove one copy from collection"
				class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={updatingCollection}
				onclick={(event) => changeCopies(event, removeCardFromCollection)}
				title="Remove one copy from collection"
			>
				<Minus class="text-white" size={iconSize} />
			</button>
			<span
				class="text-sm font-semibold text-green-400 px-1 min-w-[1.5ch] text-center select-none"
				title={`You have ${count} cop${count > 1 ? 'ies' : 'y'}`}
			>
				{count}
			</span>
		{/if}
		<button
			aria-label="Add one copy to collection"
			class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={updatingCollection || limitReached}
			onclick={(event) => changeCopies(event, addCardToCollection)}
			title={limitReached ? `Limit (${MAX_CARD_QUANTITY}) reached` : 'Add to collection'}
		>
			<Plus class={count > 0 ? 'text-green-400' : 'text-white'} size={iconSize} />
		</button>

		<div class="w-px h-5 bg-white/30 mx-1"></div>

		<button
			aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
			class="focus-ring p-1 hover:bg-white/20 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={updatingWishlist}
			onclick={toggleWishlist}
			title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
		>
			<Heart class={wishlisted ? 'text-red-500 fill-red-500' : 'text-white'} size={iconSize} />
		</button>
	</div>
{/if}

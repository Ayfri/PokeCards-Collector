<script lang="ts">
	import { resolve } from '$app/paths';
	import CardImage from '#components/card/CardImage.svelte';
	import { loading } from '#stores/loading.svelte.ts';
	import type { FullCard } from '#lib/types.js';
	import type { TrainerGroupEntry } from '#src/routes/trainers/+page.server.ts';
	import LayersIcon from '@lucide/svelte/icons/layers';

	interface Props {
		group: TrainerGroupEntry;
	}

	let { group }: Props = $props();

	/** A tile with a scan only carries the kind and types for its plate, so the printed details fall back to the "nothing to show" values the plate hides. */
	const plateCard = $derived<FullCard>({
		artist: 'Unknown',
		localId: '',
		rarity: 'None',
		...group.plate,
		cardCode: group.cardCode,
		cardMarketUrl: '',
		image: group.image,
		name: group.name,
		setId: '',
		setName: group.set?.name ?? '',
	});
</script>

<a
	class="group bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-hidden focus:ring-2 focus:ring-gold-400/75 p-3 flex flex-col items-center text-center border border-transparent hover:border-gold-400 [content-visibility:auto] [contain-intrinsic-size:auto_20rem]"
	href={resolve('/card/[cardCode]', { cardCode: group.cardCode })}
	onclick={() => (loading.navigation = true)}
	title={`View the ${group.name} prints`}
>
	<CardImage
		alt={group.name}
		card={plateCard}
		class="w-full mb-2 rounded-lg group-hover:scale-105 transition-transform duration-300 ease-in-out"
		imageUrl={group.image}
		lowRes
		set={group.set}
	/>
	<span class="text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">{group.name}</span>
	<span class="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-1" title="Prints of this card">
		<LayersIcon size={12} />
		{group.cardCount} card{group.cardCount === 1 ? '' : 's'}
	</span>
</a>

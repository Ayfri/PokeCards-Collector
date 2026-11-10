<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import { loading } from '#stores/loading.svelte.ts';
	import type { FullCard } from '#lib/types.js';
	import type { TrainerGroupEntry } from '#src/routes/trainers/+page.server.ts';

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
	class="card-tile focus-ring group p-3 flex flex-col items-center text-center [content-visibility:auto] [contain-intrinsic-size:auto_20rem]"
	href={group.path}
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
	<span class="flex grow items-center text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">{group.name}</span>
	<span class="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-1" title="Prints of this card">
		<span class="icon-layers size-3 shrink-0" aria-hidden="true"></span>
		{group.cardCount} card{group.cardCount === 1 ? '' : 's'}
	</span>
</a>

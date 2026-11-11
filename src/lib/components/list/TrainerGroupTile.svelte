<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import { formatEuros } from '#helpers/format.ts';
	import { loading } from '#stores/loading.svelte.ts';
	import type { FullCard } from '#lib/types.js';
	import type { TrainerGroupEntry } from '#src/routes/trainers/+page.server.ts';

	interface Props {
		group: TrainerGroupEntry;
		/** Distinct prints of the group the viewer owns, 0 for a logged-out visitor. It takes no room of its own: a longer count line and an absolute strip. */
		owned?: number;
	}

	let { group, owned = 0 }: Props = $props();

	/** The type sits in the name of a basic Energy ("Basic Fire Energy"), and TCGdex leaves `types` empty on some of them (Darkness, Metal). */
	const ENERGY_TYPE = /^(?:Basic )?(Colorless|Darkness|Dragon|Fairy|Fighting|Fire|Grass|Lightning|Metal|Psychic|Water) Energy$/;
	const energyType = $derived(group.plate.supertype === 'Energy' ? ENERGY_TYPE.exec(group.name)?.[1] : undefined);

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
	class="card-tile focus-ring group relative overflow-hidden p-3 flex flex-col items-center text-center [content-visibility:auto] [contain-intrinsic-size:auto_20rem]"
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
	<span class="flex grow items-center justify-center gap-1.5 text-sm md:text-base font-semibold group-hover:text-gold-400 transition-colors duration-200">
		{group.name}
		{#if energyType}
			<TypeSymbol decorative shared type={energyType} />
		{/if}
	</span>
	<!-- The price shares the count line, so the tile keeps the height it had before the price and the owned progress. -->
	<span class="flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-gray-400 mt-1">
		<span aria-hidden="true" class="icon-layers size-3 shrink-0"></span>
		<span>{owned ? `${owned} / ` : ''}{group.cardCount} print{group.cardCount === 1 ? '' : 's'}</span>
		{#if group.price}
			<span class="font-semibold text-green-400" title="Most valuable print">{formatEuros(group.price, group.price >= 100 ? 0 : 2)}</span>
		{/if}
	</span>
	{#if owned}
		<span class="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" title="{owned} of {group.cardCount} prints in your collection"><span class="block h-full bg-gold-400" style="width: {(owned / group.cardCount) * 100}%"></span></span>
	{/if}
</a>

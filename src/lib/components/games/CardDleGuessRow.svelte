<script lang="ts" module>
	/** The row and the board's header row share it, so the column titles sit over the tiles. */
	export const GUESS_COLUMNS = 'md:grid-cols-[13rem_repeat(7,minmax(0,1fr))]';
</script>

<script lang="ts">
	import CardImage from '#components/card/CardImage.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import TypeSymbol from '#components/card/TypeSymbol.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import { PRICE_HINTS } from '#helpers/card-dle.ts';
	import { formatEuros } from '#helpers/format.ts';
	import { getPokemonSpriteSrc } from '#helpers/pokemon-utils.ts';
	import type { CardDleGuess, CardDlePendingGuess, Set as CardSet } from '#lib/types.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsDownIcon from '@lucide/svelte/icons/chevrons-down';
	import ChevronsUpIcon from '@lucide/svelte/icons/chevrons-up';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import GemIcon from '@lucide/svelte/icons/gem';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	interface Props {
		/** No `feedback`: the row is the skeleton of a guess waiting for the server. */
		guess: CardDleGuess | CardDlePendingGuess;
		/** Shown as #n, the newest row is on top. */
		index: number;
		/** Only the row added this session flips, never a restored one. */
		reveal?: boolean;
		set?: Pick<CardSet, 'logo' | 'name' | 'symbol'> | undefined;
	}

	let { guess, index, reveal = false, set = undefined }: Props = $props();

	const feedback = $derived('feedback' in guess ? guess.feedback : undefined);
	const isPokemon = $derived(feedback?.supertypeValue === 'Pokémon');
	const types = $derived(feedback?.typesValue.split(',').filter(Boolean) ?? []);

	/** `undefined` is a tile that does not apply (the Pokémon of a Trainer card), drawn grey. */
	function tile(correct: boolean | undefined) {
		return [
			'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md p-1 text-center text-xs leading-tight [overflow-wrap:anywhere] md:min-h-20',
			!feedback && 'animate-pulse bg-gray-700/60',
			feedback && reveal && 'animate-flip-in motion-reduce:animate-none',
			feedback && correct === undefined && 'bg-gray-700 text-gray-300',
			feedback && correct !== undefined && ['text-white', correct ? 'bg-green-600' : 'bg-red-600']
		];
	}

	/** `position` is the tile's place in the row, 0 to 6: the tiles flip one after the other. */
	const delay = (position: number) => (reveal ? `${position * 150}ms` : undefined);

	function hint(attribute: string, correct: boolean | undefined): string {
		if (correct === undefined) return attribute;
		return correct ? `${attribute} matches the mystery card` : `Wrong ${attribute.toLowerCase()}`;
	}
</script>

<div class={['grid gap-1.5 rounded-xl border border-gray-700 bg-gray-800/60 p-2 md:border-0 md:bg-transparent md:p-0', GUESS_COLUMNS]}>
	<div class={['flex min-w-0 items-center gap-2', !feedback && 'opacity-75']}>
		<CardImage alt="Card: {guess.name}" card={guess.plate} class="h-12 w-auto rounded-sm md:h-20" imageUrl={guess.image} lazy lowRes />
		<span class="text-xs text-gray-500">#{index}</span>
		<span class="line-clamp-2 text-sm font-semibold">{guess.name}</span>
	</div>

	<div class="grid grid-cols-4 gap-1.5 sm:grid-cols-7 md:contents">
		{#if feedback}
			<div class={tile(isPokemon ? feedback.pokemonCorrect : undefined)} style:animation-delay={delay(0)} title={hint('Pokémon', isPokemon ? feedback.pokemonCorrect : undefined)}>
				<PawPrintIcon class="md:hidden" size={12} />
				{#if 'pokemonNumber' in guess && guess.pokemonNumber && isPokemon}
					<img alt="Sprite for {feedback.pokemonValue}" class="size-10 object-contain md:size-14" src={getPokemonSpriteSrc(guess.pokemonNumber)} />
				{/if}
				<span>{feedback.pokemonValue}</span>
			</div>
			<div class={tile(feedback.artistCorrect)} style:animation-delay={delay(1)} title={hint('Artist', feedback.artistCorrect)}>
				<PaintbrushIcon class="md:hidden" size={12} />
				<span>{feedback.artistValue}</span>
			</div>
			<div class={tile(feedback.setCorrect)} style:animation-delay={delay(2)} title={hint('Set', feedback.setCorrect)}>
				<LibraryIcon class="md:hidden" size={12} />
				{#if set}
					<SetLogo class="h-7 w-auto max-w-16 object-contain md:h-9 md:max-w-24" {set} />
				{/if}
				<span class="line-clamp-2">{feedback.setValue}</span>
			</div>
			<div class={tile(feedback.rarityCorrect)} style:animation-delay={delay(3)} title={hint('Rarity', feedback.rarityCorrect)}>
				<GemIcon class="md:hidden" size={12} />
				<RaritySymbol decorative rarity={feedback.rarityValue} />
				<span>{feedback.rarityValue}</span>
			</div>
			<div class={tile(feedback.supertypeCorrect)} style:animation-delay={delay(4)} title={hint('Supertype', feedback.supertypeCorrect)}>
				<LayersIcon class="md:hidden" size={12} />
				<span>{feedback.supertypeValue}</span>
			</div>
			<div class={tile(feedback.typesCorrect)} style:animation-delay={delay(5)} title={hint('Type', feedback.typesCorrect)}>
				<SparklesIcon class="md:hidden" size={12} />
				{#each types as type (type)}
					<span class="inline-flex items-center gap-1"><TypeSymbol decorative {type} />{type.trim()}</span>
				{:else}
					<span>No type</span>
				{/each}
			</div>
			<div class={tile(feedback.priceComparison === 'correct')} style:animation-delay={delay(6)} title={PRICE_HINTS[feedback.priceComparison].hint}>
				<CircleEuroIcon class="md:hidden" size={12} />
				<span class="flex items-center gap-1">
					{#if feedback.priceComparison === 'correct'}
						<CheckIcon size={16} />
					{:else if feedback.priceComparison === 'higher'}
						<ChevronsDownIcon size={16} />
					{:else}
						<ChevronsUpIcon size={16} />
					{/if}
					{formatEuros(feedback.priceValue)}
				</span>
			</div>
		{:else}
			{#each { length: 7 }, position (position)}
				<div class={tile(undefined)}></div>
			{/each}
		{/if}
	</div>
</div>

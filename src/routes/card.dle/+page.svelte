<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import CardDleGuessRow, { GUESS_COLUMNS } from '#components/games/CardDleGuessRow.svelte';
	import CardDlePicker from '#components/games/CardDlePicker.svelte';
	import CardDleRules from '#components/games/CardDleRules.svelte';
	import CardDleWinPanel from '#components/games/CardDleWinPanel.svelte';
	import PageTitle from '#components/PageTitle.svelte';
	import { easyFilters, hasEasyFilters, shiftDay } from '#helpers/card-dle.ts';
	import { readJson } from '#helpers/utils.ts';
	import type { CardDleGuessResponse, CardDlePendingGuess, CardDleSuggestion } from '#lib/types.js';
	import { cardDle } from '#stores/games.svelte.ts';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import CircleQuestionMarkIcon from '@lucide/svelte/icons/circle-question-mark';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import GemIcon from '@lucide/svelte/icons/gem';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/** The guessable cards, fetched from `/api/card-dle/suggestions` instead of being serialized into the document. */
	let suggestions = $state.raw<CardDleSuggestion[]>([]);
	let status = $state<'failed' | 'loading' | 'ready'>('loading');
	let hydrated = $state(false);
	let pending = $state.raw<CardDlePendingGuess | null>(null);
	let revealCode = $state('');
	let error = $state('');
	let rulesOpen = $state(false);

	const setsById = $derived(new Map(data.sets.map(set => [set.setId, set])));
	/** The board is stored on the device while the server renders none, so it draws only after mount. */
	const guesses = $derived(hydrated ? cardDle.guesses : []);
	const won = $derived(hydrated && cardDle.won);
	const latest = $derived(guesses.at(-1));
	const filters = $derived(easyFilters(guesses));
	const excluded = $derived(new Set([...guesses.map(guess => guess.cardCode), ...(pending ? [pending.cardCode] : [])]));

	onMount(async () => {
		cardDle.rollOver(data.today);
		hydrated = true;

		try {
			suggestions = await data.suggestions;
			status = 'ready';
		} catch {
			status = 'failed';
		}
	});

	async function guess(card: CardDleSuggestion) {
		if (pending) return;

		error = '';
		const easyUsed = cardDle.easy && hasEasyFilters(filters);
		pending = { cardCode: card.cardCode, image: card.image, name: card.name, plate: card.plate };

		try {
			const body = new FormData();
			body.append('guessedCardId', card.cardCode);

			const response = await fetch('/api/card-dle/guess', { body, method: 'POST' });
			const result = await readJson<CardDleGuessResponse>(response, { error: 'Invalid server response' });

			if (result.success) {
				const { guessedCard } = result;
				revealCode = guessedCard.cardCode;
				cardDle.add(
					{
						cardCode: guessedCard.cardCode,
						feedback: result.feedback,
						image: guessedCard.image,
						isCorrect: result.isCorrectGuess,
						name: guessedCard.name,
						plate: guessedCard.image ? undefined : guessedCard,
						pokemonNumber: guessedCard.pokemonNumber,
						setId: guessedCard.setId
					},
					result.date,
					easyUsed
				);
			} else {
				error = result.error;
			}
		} catch {
			error = 'Network error, try again';
		} finally {
			pending = null;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pt-4 pb-12 text-white md:gap-5 md:pt-7">
	<header class="flex flex-col items-center gap-2 text-center">
		<PageTitle title="Card.dle" />
		<p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-400">
			<span>Find today's mystery card in as few guesses as you can.</span>
			<button
				class="focus-ring flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-gold-400/10 px-3 py-1 font-semibold text-gold-300 transition-colors hover:bg-gold-400/20 hover:text-gold-200"
				onclick={() => (rulesOpen = true)}
				title="Read the rules of Card.dle"
				type="button"
			>
				<CircleQuestionMarkIcon size={16} /> How to play
			</button>
			{#if hydrated}
				{#if guesses.length > 0}
					<span class="tabular-nums">Guess {guesses.length}</span>
				{/if}
				{#if cardDle.streak > 0}
					<span class="flex items-center gap-1 text-orange-400 tabular-nums" title="Days in a row you found the card"><FlameIcon size={16} /> {cardDle.streak}</span>
				{/if}
			{/if}
		</p>
	</header>

	{#if won && latest}
		<CardDleWinPanel
			bestStreak={cardDle.bestStreak}
			date={cardDle.date}
			delayed={revealCode === latest.cardCode}
			easyUsed={cardDle.easyUsed}
			{guesses}
			onNewDay={() => cardDle.rollOver(shiftDay(cardDle.date, 1))}
			set={setsById.get(latest.setId)}
			streak={cardDle.streak}
		/>
	{:else}
		<CardDlePicker
			disabled={pending !== null}
			easy={hydrated && cardDle.easy}
			{excluded}
			{filters}
			{hydrated}
			onEasyChange={easy => (cardDle.easy = easy)}
			onPick={guess}
			{setsById}
			{status}
			{suggestions}
		/>
	{/if}
	{#if error}
		<p class="text-center text-sm text-red-400">{error}</p>
	{/if}

	{#if guesses.length > 0 || pending}
		<div class="flex flex-col gap-2">
			<div class={['grid gap-1.5 px-1 text-xs font-semibold text-gold-400 max-md:hidden', GUESS_COLUMNS]}>
				<span title="The card you guessed">Card</span>
				<span class="flex items-center justify-center gap-1" title="Pokémon on the card"><PawPrintIcon size={14} /> Pokémon</span>
				<span class="flex items-center justify-center gap-1" title="Illustrator of the card"><PaintbrushIcon size={14} /> Artist</span>
				<span class="flex items-center justify-center gap-1" title="Set the card was printed in"><LibraryIcon size={14} /> Set</span>
				<span class="flex items-center justify-center gap-1" title="How scarce this print is"><GemIcon size={14} /> Rarity</span>
				<span class="flex items-center justify-center gap-1" title="Pokémon, Trainer or Energy"><LayersIcon size={14} /> Supertype</span>
				<span class="flex items-center justify-center gap-1" title="Energy types on the card"><SparklesIcon size={14} /> Type(s)</span>
				<span class="flex items-center justify-center gap-1" title="Cardmarket value of the card"><CircleEuroIcon size={14} /> Price</span>
			</div>

			{#if pending}
				<CardDleGuessRow guess={pending} index={guesses.length + 1} />
			{/if}
			{#each guesses.toReversed() as played, position (played.cardCode)}
				<CardDleGuessRow guess={played} index={guesses.length - position} reveal={played.cardCode === revealCode} set={setsById.get(played.setId)} />
			{/each}
		</div>
	{:else}
		<p class="text-center text-sm text-gray-500">Each guess shows seven tiles: green matches the mystery card, red does not.</p>
	{/if}
</div>

<CardDleRules bind:open={rulesOpen} onClose={() => (rulesOpen = false)} />

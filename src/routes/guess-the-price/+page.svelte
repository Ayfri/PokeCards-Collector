<script lang="ts">
	import type { PageData } from './$types';
	import type { Round } from './+page.server';
	import { refreshAll } from '$app/navigation';
	import CardImage from '#components/card/CardImage.svelte';
	import RaritySymbol from '#components/card/RaritySymbol.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import PriceStatsModal from '#components/games/PriceStatsModal.svelte';
	import { PRICE_TIERS, judgeGuess, type RoundScore } from '#helpers/price-game.ts';
	import Numpad from '#lib/components/Numpad.svelte';
	import PageTitle from '#lib/components/PageTitle.svelte';
	import { priceGame } from '#stores/games.svelte.ts';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import GemIcon from '@lucide/svelte/icons/gem';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
	import StarIcon from '@lucide/svelte/icons/star';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import { onMount } from 'svelte';
	import { backOut, cubicOut } from 'svelte/easing';
	import { fly, scale } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	interface Verdict {
		/** Tailwind text colour for the headline. */
		color: string;
		guessed: number;
		headline: string;
		off: number;
		price: number;
		score: RoundScore;
		tier: number;
	}

	let { data }: Props = $props();

	/**
	 * The load returns a whole batch, so a turn only takes one item off the queue. Only the initial value is read:
	 * a background refill must not swap the card under the player.
	 */
	// svelte-ignore state_referenced_locally
	let queue = $state<Round[]>(data.rounds.slice(1));
	// svelte-ignore state_referenced_locally
	let round = $state<Round | null>(data.rounds[0] ?? null);
	let guess = $state('');
	let verdict = $state<Verdict | null>(null);
	let refilling = $state(false);
	let statsOpen = $state(false);
	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
	});

	const releaseDate = $derived(round?.releaseDate ? new Date(round.releaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown');
	const answered = $derived(verdict !== null);

	const CHIP = 'flex shrink-0 items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 whitespace-nowrap';

	/** The two gold plates the ripple animates: invisible until the animation classes are added, the second one half a cycle behind. */
	const RIPPLE =
		"before:content-[''] before:absolute before:left-1/2 before:top-1/2 before:size-full before:rounded-[inherit] before:bg-gold-400 before:opacity-0 " +
		"after:content-[''] after:absolute after:left-1/2 after:top-1/2 after:size-full after:rounded-[inherit] after:bg-gold-400 after:opacity-0 after:[animation-delay:1.1s]";

	function typeDigit(key: string) {
		if (answered) return;
		if (key === 'Backspace') guess = guess.slice(0, -1);
		else if (key === 'C') guess = '';
		else if (guess.length < 6) guess += key;
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		guess = input.value.replace(/\D/g, '').slice(0, 6);
		input.value = guess;
	}

	function pick(lines: string[]): string {
		return lines[Math.floor(Math.random() * lines.length)];
	}

	function submitGuess() {
		if (!round || answered) return;

		const guessed = parseInt(guess, 10);
		if (isNaN(guessed)) return;

		const price = Math.round(round.price);
		const { off, tier } = judgeGuess(guessed, price);
		const { color, high, low } = PRICE_TIERS[tier];

		verdict = { color, guessed, headline: pick(guessed < price ? low : high), off, price, score: priceGame.record(tier, off), tier };
		verdictAt = performance.now();
		if (tier === 0) window.confetti?.({ origin: { y: 0.6 }, particleCount: 150, spread: 100 });
	}

	/** Re-running the load re-reads every card and price, so it runs in the background while the player is still busy. */
	async function refill() {
		if (refilling) return;
		refilling = true;
		await refreshAll();
		queue = [...queue, ...data.rounds];
		refilling = false;
	}

	/**
	 * Next takes Submit's place on mobile and Enter does both, so a double tap or a held key would skip the verdict
	 * before the player sees it. The draw ignores input for a short moment after each verdict.
	 */
	let verdictAt = 0;
	const VERDICT_LOCK_MS = 400;

	async function nextCard() {
		if (performance.now() - verdictAt < VERDICT_LOCK_MS) return;
		if (!queue.length) await refill();

		round = queue.shift() ?? null;
		guess = '';
		verdict = null;

		if (queue.length < 5) refill();
	}

	/** Digits, Backspace, Escape and Enter play a whole game, so neither the mouse nor the on-screen keypad is required. */
	function handleKey(event: KeyboardEvent) {
		if (statsOpen) return;

		const target = event.target as HTMLElement | null;
		if (target?.tagName === 'TEXTAREA' || (target?.tagName === 'INPUT' && target.id !== 'price-guess')) return;

		if (event.key === 'Enter') {
			if (target?.id === 'price-stats') return;
			event.preventDefault();
			if (event.repeat) return;
			if (answered) nextCard();
			else submitGuess();
		} else if (event.key === 'Escape') {
			typeDigit('C');
		} else if (event.key === 'Backspace' && target?.id !== 'price-guess') {
			event.preventDefault();
			typeDigit('Backspace');
		} else if (/^\d$/.test(event.key) && target?.id !== 'price-guess') {
			typeDigit(event.key);
		}
	}
</script>

<svelte:window onkeydown={handleKey} />

<svelte:head>
	<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js"></script>
</svelte:head>

<!-- The board height is the viewport minus the layout's header offset (`pt-24` / `lg:pt-32`), because the `min-h-screen` layout never caps a child's height.
     The top padding leaves room for the PageTitle ghost that overflows above it, which `overflow-hidden` would clip.
     The panel keeps one height whatever the state: the verdict covers the keypad's slot and the action button sits on the input's row under `md`,
     so on a 375x667 phone only the art row shrinks, to about 170 px. -->
<div class="mx-auto flex h-[calc(100dvh-6rem)] w-full max-w-6xl flex-col items-center gap-2 overflow-hidden px-3 pt-4 pb-3 md:gap-3 md:pt-7 lg:h-[calc(100dvh-8rem)] lg:gap-5">
	<PageTitle title="Guess the Price!" />
	<button
		class="focus-ring flex h-7 w-full max-w-md shrink-0 items-center justify-center gap-3 rounded-full border border-gold-500/30 bg-gray-800/70 px-3 text-xs text-gray-300 tabular-nums transition-colors hover:border-gold-400"
		aria-label="Your stats"
		id="price-stats"
		onclick={() => (statsOpen = true)}
		title="Your stats"
		type="button"
	>
		{#if hydrated}
			<span class="flex items-center gap-1" title="Current streak">
				<FlameIcon class={priceGame.stats.streak >= 2 ? 'text-orange-400' : 'text-gray-400'} size={14} />
				{priceGame.stats.streak}
			</span>
			<span class="flex items-center gap-1" title="Best streak">
				<TrophyIcon class="text-gold-400" size={14} />
				{priceGame.stats.bestStreak}
			</span>
			<span class="flex items-center gap-1" title="Total score">
				<StarIcon class="text-gold-400" size={14} />
				{priceGame.stats.totalScore.toLocaleString('en-US')}
			</span>
			<span class="flex gap-1 max-2xs:hidden" aria-label="Last rounds" role="img">
				{#each priceGame.stats.history as tier, index (index)}
					<span class={['size-2 rounded-full', PRICE_TIERS[tier].bar]}></span>
				{/each}
			</span>
		{/if}
		<ChartColumnIcon class="text-gold-400" size={14} />
	</button>

	{#if !round}
		<p class="text-xl text-gray-400">{data.error ?? 'No card to display.'}</p>
		<button
			class="btn-gold"
			disabled={refilling}
			onclick={nextCard}
		>
			{refilling ? 'Drawing...' : 'Retry'}
		</button>
	{:else}
		<!-- Stacked on mobile, only the art row may shrink, so the keypad is never clipped. -->
		<section class="grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:grid-rows-1 lg:gap-8">
			<!-- The art takes all the space the column has left. -->
			<div class="flex min-h-0 flex-col items-center justify-center gap-2">
				{#key round.card.cardCode}
					<!-- `flex-initial`, not `flex-1`: the box shrinks when the column is short but never grows past the card, so the name sits right under it. -->
					<div class="flex min-h-0 flex-initial items-center" in:fly={{ duration: 350, easing: cubicOut, y: 24 }}>
						<CardImage
							alt={round.card.name}
							class="max-h-full w-auto rounded-xl object-contain shadow-2xl shadow-black/60"
							imageUrl={round.card.image}
							priority
							sizes="(max-width: 768px) 60vw, 320px"
							types={round.card.types}
						/>
					</div>
					<div class="flex max-w-full shrink-0 flex-col items-center gap-1.5" in:fly={{ delay: 80, duration: 350, easing: cubicOut, y: 12 }}>
						<h2 class="text-center text-xl font-semibold text-gold-300 sm:text-2xl">{round.card.name}</h2>
						<div class="flex max-w-full flex-wrap justify-center-safe gap-2 text-sm text-gray-300 max-md:flex-nowrap max-md:overflow-x-auto scrollbar-hide">
							<span class={CHIP} title="Set this card was printed in">
								<LibraryIcon size={16} />
								{#if round.set}
									<SetLogo class="h-5 w-auto max-w-12 shrink-0 object-contain" set={round.set} />
								{/if}
								{round.card.setName}
							</span>
							<span class={CHIP} title="How scarce this print is"><GemIcon size={16} /> <RaritySymbol decorative rarity={round.card.rarity} /> {round.card.rarity}</span>
							<span class={CHIP} title="Release date of the set"><CalendarDaysIcon size={16} /> {releaseDate}</span>
						</div>
					</div>
				{/key}
			</div>

			<div class="flex min-h-0 flex-col gap-2 rounded-2xl border border-gold-500/30 bg-gray-800/70 p-3 backdrop-blur-sm md:justify-center md:gap-3 md:p-4">
				<form class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:grid-cols-1" onsubmit={event => { event.preventDefault(); submitGuess(); }}>
					<label class="col-span-2 flex items-baseline justify-between text-sm font-medium text-gray-300 max-md:sr-only md:col-span-1" for="price-guess">
						Your guess
						<span class="text-xs text-gray-500">type digits, Enter to {answered ? 'draw' : 'submit'}</span>
					</label>
					<div class="flex items-center gap-2 rounded-lg border border-gold-500/60 bg-gray-900 px-3 py-2 transition-colors focus-within:border-gold-300">
						<CircleEuroIcon class="shrink-0 text-gold-400" size={20} />
						<input
							class="w-full bg-transparent text-lg text-gray-100 tabular-nums outline-hidden placeholder:text-gray-500 read-only:text-gray-500"
							id="price-guess"
							inputmode="numeric"
							oninput={handleInput}
							placeholder="12"
							readonly={answered}
							required
							type="text"
							value={guess}
						/>
					</div>

					{#if answered}
						<button
							class={['btn-gold relative overflow-hidden transition-all active:scale-[0.98] md:order-last', RIPPLE, 'before:animate-ripple-wave after:animate-ripple-wave']}
							onclick={nextCard}
							title="Draw another random card (Enter)"
							type="button"
						>
							<span class="relative z-10 flex items-center justify-center gap-2">
								<RotateCwIcon size={18} />
								Next<span class="ms-1 max-md:hidden">card</span>
							</span>
						</button>
					{:else}
						<button
							class="btn-gold transition-all active:scale-[0.98] md:order-last"
							disabled={!guess}
							title="Check how close your guess is (Enter)"
							type="submit"
						>
							<CircleEuroIcon size={18} />
							<span>Submit<span class="ms-1 max-md:hidden">guess</span></span>
						</button>
					{/if}

					<div class="relative col-span-2 md:col-span-1">
						<div class={[answered && 'invisible']}>
							<Numpad onKeyPress={typeDigit} />
						</div>
						{#if verdict}
							<div
								class="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-gold-400/40 bg-gray-900 p-2 text-center"
								in:fly={{ duration: 250, easing: cubicOut, y: 10 }}
							>
								<p class="text-lg font-semibold {verdict.color}">{verdict.headline}</p>
								<p class="text-3xl font-bold text-gold-300 tabular-nums" in:scale={{ duration: 450, easing: backOut, start: 0.6 }}>{verdict.price} €</p>
								<p class="text-xs text-gray-400">You said {verdict.guessed} € - {Math.round(verdict.off)}% off</p>
								<p class="flex items-center gap-2 text-lg font-bold text-gold-300">
									<span in:scale={{ duration: 450, easing: backOut, start: 0.6 }}>+{verdict.score.points}</span>
									{#if verdict.score.multiplier > 1}
										<span class="flex items-center gap-1 text-xs font-medium text-orange-400">
											<FlameIcon size={14} />
											streak {verdict.score.streak} - x{verdict.score.multiplier}
										</span>
									{/if}
								</p>
								{#if verdict.score.lostStreak >= 3}
									<p class="text-xs text-gray-500">Streak of {verdict.score.lostStreak} lost</p>
								{/if}
							</div>
						{/if}
					</div>
				</form>
			</div>
		</section>
	{/if}
</div>

<PriceStatsModal onClose={() => (statsOpen = false)} bind:open={statsOpen} />

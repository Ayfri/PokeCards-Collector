<script lang="ts">
	import type { PageData } from './$types';
	import type { Round } from './+page.server';
	import { invalidateAll } from '$app/navigation';
	import CardImage from '@components/card/CardImage.svelte';
	import Numpad from '$lib/components/Numpad.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import GemIcon from '@lucide/svelte/icons/gem';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
	import { backOut, cubicOut } from 'svelte/easing';
	import { fly, scale } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	interface Verdict {
		/** Tailwind text colour for the headline. */
		color: string;
		correct: boolean;
		headline: string;
		price: number;
	}

	let { data }: Props = $props();

	/**
	 * The load hands over a whole batch, so a turn costs nothing but a shift off the queue. Only the initial value is
	 * read: a background refill must not swap the card out from under the player.
	 */
	// svelte-ignore state_referenced_locally
	let queue = $state<Round[]>(data.rounds.slice(1));
	// svelte-ignore state_referenced_locally
	let round = $state<Round | null>(data.rounds[0] ?? null);
	let guess = $state('');
	let verdict = $state<Verdict | null>(null);
	let refilling = $state(false);

	const releaseDate = $derived(round?.releaseDate ? new Date(round.releaseDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown');
	const answered = $derived(verdict !== null);

	/** The two gold plates the ripple animates, invisible until the animation classes are added, the second half a cycle behind. */
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

	const EXACT = ['Spot on!', 'Nailed it!', 'Perfect call!', 'Are you a dealer or what?', 'To the euro. Respect.'];

	/**
	 * Miss tiers by percentage off the real price, first match wins, so a 2 EUR miss on a 5 EUR card stings as much as
	 * a 40 EUR miss on a 100 EUR one. Each side gets its own lines so the hint always says which way to move.
	 */
	const TIERS: { color: string; high: string[]; low: string[]; maxOff: number }[] = [
		{
			color: 'text-lime-400',
			high: ['So close, shave a little off.', 'Nearly! Trim it down a touch.', 'Painfully close, aim a bit lower.'],
			low: ['So close, add a little more.', 'Nearly! Bump it up a touch.', 'Painfully close, aim a bit higher.'],
			maxOff: 10
		},
		{
			color: 'text-yellow-400',
			high: ['A bit high.', 'Slightly overvalued.', 'It is worth less than you think.'],
			low: ['A bit low.', 'Slightly undervalued.', 'It is worth more than you think.'],
			maxOff: 30
		},
		{
			color: 'text-orange-400',
			high: ['Too high, this one is cheaper.', 'Easy there, big spender.', 'You just overpaid, badly.'],
			low: ['Too low, this one is pricier.', 'You are lowballing this card.', 'That offer would get you laughed at.'],
			maxOff: 75
		},
		{
			color: 'text-red-400',
			high: ['Way too high! Save your wallet.', 'Not even close, it is no Charizard.', 'That is full collector fever pricing.'],
			low: ['Way too low! That is bulk bin energy.', 'Not even close, this is no common.', 'Cold. Very, very cold.'],
			maxOff: Infinity
		}
	];

	function pick(lines: string[]): string {
		return lines[Math.floor(Math.random() * lines.length)];
	}

	function judge(guessed: number, price: number): Verdict {
		if (guessed === price) return { color: 'text-green-400', correct: true, headline: pick(EXACT), price };

		const off = price > 0 ? (Math.abs(guessed - price) / price) * 100 : Infinity;
		const low = guessed < price;
		const tier = TIERS.find(candidate => off <= candidate.maxOff) ?? TIERS[TIERS.length - 1];
		return { color: tier.color, correct: false, headline: pick(low ? tier.low : tier.high), price };
	}

	function submitGuess() {
		if (!round || answered) return;

		const guessed = parseInt(guess, 10);
		if (isNaN(guessed)) return;

		verdict = judge(guessed, Math.round(round.price));
		if (verdict.correct) window.confetti?.({ origin: { y: 0.6 }, particleCount: 150, spread: 100 });
	}

	/** Re-running the load re-reads every card and price, so it happens in the background while the player is still busy. */
	async function refill() {
		if (refilling) return;
		refilling = true;
		await invalidateAll();
		queue = [...queue, ...data.rounds];
		refilling = false;
	}

	async function nextCard() {
		if (!queue.length) await refill();

		round = queue.shift() ?? null;
		guess = '';
		verdict = null;

		if (queue.length < 5) refill();
	}

	/** Digits, Backspace, Escape and Enter drive a whole game, so the mouse and the keypad are both optional. */
	function handleKey(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target?.tagName === 'TEXTAREA' || (target?.tagName === 'INPUT' && target.id !== 'price-guess')) return;

		if (event.key === 'Enter') {
			event.preventDefault();
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

<!-- The board is sized to the space left under the header so the whole game fits without a scroll. -->
<div class="mx-auto flex h-[calc(100dvh-7rem)] max-w-6xl flex-col items-center gap-3 overflow-hidden px-3 pb-3 lg:h-[calc(100dvh-9rem)] lg:gap-5">
	<PageTitle title="Guess the Price!" />
	<div class="h-px w-full max-w-md bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>

	{#if !round}
		<p class="text-xl text-gray-400">{data.error ?? 'No card to display.'}</p>
		<button
			class="rounded-sm bg-gold-400 px-4 py-2 font-bold text-black transition-colors hover:bg-gold-500 disabled:opacity-50"
			disabled={refilling}
			onclick={nextCard}
		>
			{refilling ? 'Drawing...' : 'Retry'}
		</button>
	{:else}
		<!-- Stacked on mobile the art row is the only one allowed to shrink, so the keypad never gets clipped. -->
		<section class="grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:grid-rows-1 lg:gap-8">
			<!-- Card side: the art takes every pixel the column has left over. -->
			<div class="flex min-h-0 flex-col items-center justify-center gap-2 md:gap-3">
				{#key round.card.cardCode}
					<div class="flex min-h-0 flex-1 items-center" in:fly={{ duration: 350, easing: cubicOut, y: 24 }}>
						<CardImage
							alt={round.card.name}
							class="max-h-full w-auto rounded-xl object-contain shadow-2xl shadow-black/60"
							imageUrl={round.card.image}
							priority
							sizes="(max-width: 768px) 60vw, 320px"
							types={round.card.types}
						/>
					</div>
					<div class="flex shrink-0 flex-col items-center gap-1.5" in:fly={{ delay: 80, duration: 350, easing: cubicOut, y: 12 }}>
						<h2 class="text-center text-xl font-semibold text-gold-300 sm:text-2xl">{round.card.name}</h2>
						<div class="flex flex-wrap justify-center gap-1.5 text-xs text-gray-400">
							<span class="flex items-center gap-1.5 rounded-full bg-gray-800/80 px-2.5 py-1" title="Set this card was printed in"><LibraryIcon size={13} /> {round.card.setName}</span>
							<span class="flex items-center gap-1.5 rounded-full bg-gray-800/80 px-2.5 py-1" title="How scarce this print is"><GemIcon size={13} /> {round.card.rarity}</span>
							<span class="flex items-center gap-1.5 rounded-full bg-gray-800/80 px-2.5 py-1" title="Release date of the set"><CalendarDaysIcon size={13} /> {releaseDate}</span>
						</div>
					</div>
				{/key}
			</div>

			<!-- Control side: guess, keypad and verdict, all stacked in one column. -->
			<div class="flex min-h-0 flex-col gap-2 rounded-2xl border border-gold-500/30 bg-gray-800/70 p-3 backdrop-blur-sm md:justify-center md:gap-3 md:p-4">
				<form class="flex flex-col gap-2" onsubmit={event => { event.preventDefault(); submitGuess(); }}>
					<label class="flex items-baseline justify-between text-sm font-medium text-gray-300" for="price-guess">
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

					<Numpad onKeyPress={typeDigit} />

					{#if !answered}
						<button
							class="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 py-2.5 font-bold text-black transition-all hover:bg-gold-500 active:scale-[0.98] disabled:opacity-40"
							disabled={!guess}
							title="Check how close your guess is (Enter)"
							type="submit"
						>
							<CircleEuroIcon size={18} />
							Submit guess
						</button>
					{/if}
				</form>

				{#if verdict}
					<div class="flex flex-col items-center gap-2" in:fly={{ duration: 250, easing: cubicOut, y: 10 }}>
						<p class="text-lg font-semibold {verdict.color}">{verdict.headline}</p>
						<p class="text-3xl font-bold text-gold-300 tabular-nums" in:scale={{ duration: 450, easing: backOut, start: 0.6 }}>{verdict.price} €</p>
						<button
							class="relative w-full overflow-hidden rounded-lg bg-gold-400 py-2.5 font-bold text-black transition-all hover:bg-gold-500 active:scale-[0.98] {RIPPLE} before:animate-ripple-wave after:animate-ripple-wave"
							onclick={nextCard}
							title="Draw another random card (Enter)"
							type="button"
						>
							<span class="relative z-10 flex items-center justify-center gap-2">
								<RotateCwIcon size={18} />
								Next card
							</span>
						</button>
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>

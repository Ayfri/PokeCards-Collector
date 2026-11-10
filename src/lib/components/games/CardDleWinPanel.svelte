<script lang="ts">
	import { page } from '$app/state';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import CardImage from '#components/card/CardImage.svelte';
	import SetLogo from '#components/SetLogo.svelte';
	import { shareText } from '#helpers/card-dle.ts';
	import type { CardDleGuess, Set as CardSet } from '#lib/types.js';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import PartyPopperIcon from '@lucide/svelte/icons/party-popper';
	import Share2Icon from '@lucide/svelte/icons/share-2';
	import TimerIcon from '@lucide/svelte/icons/timer';

	interface Props {
		bestStreak: number;
		/** UTC day of the board, `YYYY-MM-DD`. */
		date: string;
		/** The win was just revealed: the panel waits for the last row to flip. A reloaded board shows it at once. */
		delayed: boolean;
		/** Easy mode narrowed the list for at least one guess: the shared text says so. */
		easyUsed: boolean;
		/** Oldest first: the winning card is the last one. */
		guesses: CardDleGuess[];
		/** The countdown reached the next card: the board starts over. */
		onNewDay: () => void;
		set?: Pick<CardSet, 'logo' | 'name' | 'symbol'> | undefined;
		streak: number;
	}

	let { bestStreak, date, delayed, easyUsed, guesses, onNewDay, set = undefined, streak }: Props = $props();

	const winner = $derived(guesses[guesses.length - 1]);
	const nextMidnight = $derived(Date.parse(`${date}T00:00:00Z`) + 86_400_000);
	let now = $state(Date.now());
	let shareLabel = $state('Share');
	let shareTimer: ReturnType<typeof setTimeout> | undefined;

	const remaining = $derived(nextMidnight - now);
	const countdown = $derived.by(() => {
		const seconds = Math.max(0, Math.floor(remaining / 1000));
		return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(unit => String(unit).padStart(2, '0')).join(':');
	});

	/** A ticking clock is the one job an effect has here: `now` has no source to derive from. */
	$effect(() => {
		const timer = setInterval(() => {
			now = Date.now();
			if (now >= nextMidnight) onNewDay();
		}, 1000);
		return () => clearInterval(timer);
	});

	$effect(() => () => clearTimeout(shareTimer));

	async function share() {
		try {
			await navigator.clipboard.writeText(shareText(date, guesses, new URL('/card.dle', page.url.origin).href, easyUsed));
			shareLabel = 'Copied!';
		} catch {
			shareLabel = 'Copy failed';
		}

		clearTimeout(shareTimer);
		shareTimer = setTimeout(() => (shareLabel = 'Share'), 2000);
	}
</script>

<div
	class="flex flex-col items-center gap-3 rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-center sm:flex-row sm:text-left"
	in:fly={{ delay: delayed && !prefersReducedMotion.current ? 900 : 0, duration: prefersReducedMotion.current ? 0 : 300, y: 12 }}
>
	<CardImage alt="Card: {winner.name}" card={winner.plate} class="h-28 w-auto rounded-sm" imageUrl={winner.image} lowRes />

	<div class="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:items-start">
		<h2 class="flex items-center gap-2 text-lg font-bold text-green-400">
			<PartyPopperIcon size={20} /> Found in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
		</h2>
		<p class="flex items-center gap-2 text-sm font-semibold text-white">
			{#if set}
				<SetLogo class="h-4 w-auto max-w-12 shrink-0 object-contain" {set} />
			{/if}
			{winner.name}
		</p>
		<p class="flex items-center gap-1.5 text-sm text-gray-300">
			<FlameIcon class={streak >= 2 ? 'text-orange-400' : 'text-gray-400'} size={16} /> Daily streak {streak} - best {bestStreak}
		</p>
		<p class="flex items-center gap-1.5 text-xs text-gray-400 tabular-nums"><TimerIcon size={14} /> Next card in {countdown}</p>
	</div>

	<button class="btn-gold flex items-center gap-2" onclick={share} type="button"><Share2Icon size={16} /> {shareLabel}</button>
</div>

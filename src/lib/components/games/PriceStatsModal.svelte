<script lang="ts">
	import Modal from '#components/ui/Modal.svelte';
	import { PRICE_TIERS, tierLabel } from '#helpers/price-game.ts';
	import { priceGame } from '#stores/games.svelte.ts';

	interface Props {
		onClose: () => void;
		open: boolean;
	}

	let { onClose, open = $bindable() }: Props = $props();

	let confirming = $state(false);

	const stats = $derived(priceGame.stats);
	const rounds = $derived(priceGame.rounds);
	const maxCount = $derived(Math.max(1, ...PRICE_TIERS.map((_, index) => stats.distribution[index] ?? 0)));
	const lastTier = $derived(stats.history.at(-1));
	const cells = $derived([
		{ label: 'Played', value: String(rounds) },
		{ label: 'Hit rate', value: rounds > 0 ? `${Math.round((priceGame.hits / rounds) * 100)}%` : '-' },
		{ label: 'Exact', value: String(priceGame.exact) },
		{ label: 'Avg off', value: priceGame.averageOff === null ? '-' : `${Math.round(priceGame.averageOff)}%` },
		{ label: 'Streak', value: String(stats.streak) },
		{ label: 'Best streak', value: String(stats.bestStreak) },
		{ label: 'Total score', value: stats.totalScore.toLocaleString('en-US') },
		{ label: 'Best round', value: String(stats.bestRound) }
	]);

	function close() {
		confirming = false;
		onClose();
	}

	function reset() {
		if (!confirming) {
			confirming = true;
			return;
		}

		priceGame.reset();
		confirming = false;
	}
</script>

<Modal bind:open containerClass="max-w-md" onClose={close} title="Your stats">
	<div class="grid grid-cols-4 gap-2 text-center">
		{#each cells as cell (cell.label)}
			<div class="flex flex-col">
				<span class="text-2xl font-bold text-gold-300 tabular-nums">{cell.value}</span>
				<span class="text-[11px] text-gray-400">{cell.label}</span>
			</div>
		{/each}
	</div>

	<h3 class="mt-5 mb-2 text-sm font-medium text-gray-300">Guess distribution</h3>
	<div class="flex flex-col gap-1">
		{#each PRICE_TIERS as tier, index (index)}
			{@const count = stats.distribution[index] ?? 0}
			<div class="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs">
				<span class="text-gray-400">{tierLabel(index)}</span>
				<div
					class={['flex h-5 items-center justify-end rounded-sm px-1.5 font-bold text-black tabular-nums', tier.bar, lastTier === index && 'ring-2 ring-white/70']}
					style:width="{Math.max((count / maxCount) * 100, 6)}%"
				>
					{count}
				</div>
			</div>
		{/each}
	</div>

	{#snippet footer()}
		<button class={['focus-ring rounded-lg px-3 py-2 text-sm transition-colors', confirming ? 'bg-red-600 font-bold text-white hover:bg-red-500' : 'text-gray-400 hover:text-white']} onclick={reset} type="button">
			{confirming ? 'Click again to reset' : 'Reset stats'}
		</button>
		<button class="btn-gold" onclick={close} type="button">Close</button>
	{/snippet}
</Modal>

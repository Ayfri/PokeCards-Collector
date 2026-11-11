<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardImage from '#components/card/CardImage.svelte';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import type { BinderTile } from '#lib/types.js';

	interface Props {
		/** Buttons next to the page figures, such as the page menu. */
		actions?: Snippet;
		/** Without `cell` the sheet is a static display, as on the home page and a shared binder. */
		cell?: Snippet<[position: number, tile: BinderTile | null]>;
		columns: number;
		pageIndex: number;
		rows: number;
		slots: readonly (BinderTile | null)[];
	}

	let { actions, cell, columns, pageIndex, rows, slots }: Props = $props();

	const slotsPerPage = $derived(rows * columns);
	const filled = $derived(slots.filter(Boolean).length);
</script>

{#snippet image(tile: BinderTile)}
	<CardImage
		alt={tile.name}
		class="max-h-full max-w-full rounded-[4%] object-contain {NO_IMAGES ? 'ring-1 ring-gold-400 ring-inset' : ''}"
		imageUrl={tile.image}
		lazy={true}
		types={tile.types}
	/>
{/snippet}

<div class="flex h-full min-h-0 flex-col gap-2 rounded-xl bg-gray-800/70 p-3 ring-1 ring-white/5">
	<div class="flex items-center justify-between gap-2 px-1 text-xs">
		<span class="font-semibold text-gold-400">Page {pageIndex + 1}</span>
		<span class="flex items-center gap-2">
			<span class="text-gray-400 tabular-nums">{filled}/{slotsPerPage}</span>
			{@render actions?.()}
		</span>
	</div>

	<!-- The sheet takes the tallest size that fits, so the cards are as big as the viewport allows. -->
	<div class="grid min-h-0 flex-1 place-items-center [container-type:size]">
		<div
			class="grid max-h-full w-full gap-2 grid-cols-[repeat(var(--columns),minmax(0,1fr))] grid-rows-[repeat(var(--rows),minmax(0,1fr))]"
			style:--columns={columns}
			style:--rows={rows}
			style:aspect-ratio="{columns * 2.5} / {rows * 3.5}"
			style:width="min(100%, calc(100cqh * {columns * 2.5} / {rows * 3.5}))"
		>
			{#each Array(slotsPerPage) as _, position (position)}
				{@const tile = slots[position] ?? null}
				{#if cell}
					{@render cell(position, tile)}
				{:else}
					<div class={['relative min-h-0 rounded-md border border-gray-700', tile ? 'bg-gray-900' : 'bg-gray-900/40']}>
						{#if tile}
							<div class="absolute inset-0 flex items-center justify-center p-px">
								{#if tile.href}
									<a class="flex size-full items-center justify-center" href={tile.href}>
										{@render image(tile)}
									</a>
								{:else}
									{@render image(tile)}
								{/if}
							</div>
						{:else}
							<span class="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-600 tabular-nums">{pageIndex * slotsPerPage + position + 1}</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

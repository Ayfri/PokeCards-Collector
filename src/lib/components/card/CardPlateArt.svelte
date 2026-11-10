<script lang="ts">
	import { processCardImage, scanWidths } from '#helpers/card-images.ts';

	interface Props {
		alt: string;
		/** Extensionless TCGdex image base, or CardTrader scan URL, of the scan whose illustration box fills the window. */
		base: string;
		/** Covers the whole plate instead of the window: the full-art cards, whose illustration is the card. */
		full?: boolean;
		onerror?: () => void;
		/** A Trainer prints its `TRAINER` line above the name, which pushes its illustration box lower on the card. */
		trainer?: boolean;
	}

	let { alt, base, full = false, onerror, trainer = false }: Props = $props();

	const [lowWidth, highWidth] = $derived(scanWidths(base));
	const srcset = $derived(`${processCardImage(base, 'low')} ${lowWidth}w, ${processCardImage(base)} ${highWidth}w`);
</script>

<!-- The crop needs a `relative` parent, the art window of `CardPlate`; `full` needs the plate's body, which it fills from behind its content.
     The illustration box spans 8-92 % of a scan's width and 11.5-47 % of its height, which starts under the header bar and stops above the Pokédex
     line printed under the art (centered at 50 % and 29.25 %, 33 % on a Trainer whose `TRAINER` line sits above the name), so the scan is scaled to the larger of the two widths that cover the window, then shifted to put that center
     on the window's center. The wrapper is a size container, so `cqw` / `cqh` here are the window's own size, whatever its height.
     `sizes="auto"` lets the browser pick the low or the high scan (`scanWidths`) from the rendered width, which is why the image is lazy. -->
{#if full}
	<img
		{alt}
		class="absolute inset-0 -z-10 size-full object-cover @max-[120px]:hidden"
		decoding="async"
		draggable="false"
		loading="lazy"
		{onerror}
		sizes="auto"
		src={processCardImage(base, 'low')}
		{srcset}
	/>
{:else}
	<div class="absolute inset-0 overflow-hidden rounded-[inherit] [container-type:size] @max-[120px]:hidden">
		<img
			{alt}
			class={['absolute top-1/2 left-1/2 aspect-245/337 h-auto w-[max(calc(100cqw/0.84),calc(100cqh/0.488))] max-w-none -translate-x-1/2', trainer ? '-translate-y-[33%]' : '-translate-y-[29.25%]']}
			decoding="async"
			draggable="false"
			loading="lazy"
			{onerror}
			sizes="auto"
			src={processCardImage(base, 'low')}
			{srcset}
		/>
	</div>
{/if}

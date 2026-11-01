<script lang="ts">
	import { processCardImage } from '#helpers/card-images.ts';

	interface Props {
		/** Extensionless TCGdex image base of the scan whose illustration box fills the window. */
		base: string;
		/** Where the artwork comes from, drawn as a chip on the window. */
		note?: string;
		onerror?: () => void;
	}

	let { base, note = '', onerror }: Props = $props();
</script>

<!-- Needs a `relative` parent, the art window of `CardPlate`. The illustration box spans 8-92 % of a scan's width and 11-50 % of its height (centered at
     50 % and 30.5 %), so the scan is scaled to the larger of the two widths that cover the window, then shifted to put that center on the window's center.
     The wrapper is a size container, so `cqw` / `cqh` here are the window's own size, whatever its height. `sizes="auto"` lets the browser pick the
     245px or the 600px scan from the rendered width, which is why the image is lazy. -->
<div class="absolute inset-0 overflow-hidden rounded-[inherit] [container-type:size] @max-[120px]:hidden">
	<img
		alt=""
		class="absolute top-1/2 left-1/2 aspect-245/337 h-auto w-[max(calc(100cqw/0.84),calc(100cqh/0.5365))] max-w-none -translate-x-1/2 -translate-y-[30.5%]"
		decoding="async"
		draggable="false"
		loading="lazy"
		{onerror}
		sizes="auto"
		src={processCardImage(base, 'low')}
		srcset="{processCardImage(base, 'low')} 245w, {processCardImage(base)} 600w"
	/>
</div>
{#if note}
	<span class="absolute right-[2cqw] bottom-[2cqw] rounded-full bg-black/55 px-[2.5cqw] py-[0.5cqw] text-[3cqw] tracking-wide whitespace-nowrap text-white/75 @max-[200px]:hidden">{note}</span>
{/if}

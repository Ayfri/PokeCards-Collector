<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		children: Snippet<[close: () => void]>;
		class?: ClassValue;
		/** Tooltip of the trigger, and its accessible name when the trigger holds only an icon. */
		label: string;
		placement?: 'bottom-end' | 'bottom-start' | 'top-end';
		trigger: Snippet;
		triggerClass?: ClassValue;
	}

	let { children, class: classNames, label, placement = 'bottom-end', trigger, triggerClass }: Props = $props();

	const id = $props.id();
	let panel = $state<HTMLDivElement>();

	const AREAS = {
		'bottom-end': 'supports-[position-area:bottom]:[position-area:bottom_span-left]',
		'bottom-start': 'supports-[position-area:bottom]:[position-area:bottom_span-right]',
		'top-end': 'supports-[position-area:bottom]:[position-area:top_span-left]'
	};
</script>

<button
	class={[
		'focus-ring flex h-8 items-center justify-center gap-2 rounded border-2 border-white bg-transparent px-3 text-sm text-white transition-colors hover:border-gold-400 hover:text-gold-400 [&:has(+:popover-open)]:border-gold-400 [&:has(+:popover-open)]:text-gold-400',
		triggerClass
	]}
	popovertarget={id}
	style:anchor-name="--{id}"
	title={label}
	type="button"
>
	{@render trigger()}
</button>

<!-- A native popover: the top layer escapes the board's overflow clipping, and Escape, light dismiss and focus return come with it.
     Without CSS anchor positioning it keeps the browser's own placement and opens centred. -->
<div
	{id}
	bind:this={panel}
	class={[
		'w-max max-w-[calc(100vw-1rem)] rounded-lg border border-gray-700 bg-gray-800 p-3 text-white shadow-xl',
		'supports-[position-area:bottom]:inset-auto supports-[position-area:bottom]:mx-0 supports-[position-area:bottom]:my-1',
		'supports-[position-area:bottom]:[position-try-fallbacks:flip-block]',
		AREAS[placement],
		classNames
	]}
	popover="auto"
	style:position-anchor="--{id}"
>
	{@render children(() => panel?.hidePopover())}
</div>

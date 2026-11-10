<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		/** Tailwind classes that size the circle and its initial, e.g. `size-16 text-2xl`. */
		class?: ClassValue;
		/** Hex color, `#RRGGBB`. Anything else falls back to the gold default. */
		profileColor?: string | null;
		username: string;
	}

	let { class: className = 'size-8 text-lg', profileColor = null, username }: Props = $props();

	/** The end stop is 45% darker, otherwise the gradient would not show. */
	const gradientStyle = $derived(profileColor && /^#[0-9A-Fa-f]{6}$/.test(profileColor)
		? `background-image: linear-gradient(to bottom right, ${profileColor}, color-mix(in srgb, ${profileColor} 55%, black));`
		: 'background-image: linear-gradient(to bottom right, var(--color-gold-400), var(--color-gold-600));');
</script>

<div
	class={[className, 'rounded-full flex items-center justify-center text-white uppercase font-bold']}
	style={gradientStyle}
>
	{username.charAt(0)}
</div>

<script lang="ts">
	import { PLATE_ICONS } from '#helpers/card-plate-icons.ts';
	import Rainbow from '@lucide/svelte/icons/rainbow';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		class?: ClassValue;
		/** An energy type name such as `Fire`, in any case. An unknown one gets the rainbow glyph on the colorless fill. */
		type: string;
	}

	let { class: classNames = '', type }: Props = $props();

	const key = $derived(type.trim().toLowerCase());
	const Icon = $derived(PLATE_ICONS[key] ?? Rainbow);
</script>

<!-- The `--<type>` pair from `colors.css` fills the badge. White on yellow or gray stays readable thanks to the glyph's shadow. -->
<span
	aria-label={type}
	class={[
		'inline-flex size-[1.15em] shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,var(--type-a),var(--type-b))] align-[-0.2em] shadow-[inset_0_0_0_0.06em_rgb(255_255_255/0.5),0_0.05em_0.15em_rgb(0_0_0/0.5)]',
		classNames
	]}
	role="img"
	style="--type-a: var(--{key}, var(--colorless)); --type-b: var(--{key}2, var(--colorless2))"
>
	<Icon class="size-[62%] text-white drop-shadow-[0_0_0.08em_rgb(0_0_0/0.55)]" strokeWidth={2.5} />
</span>

<script lang="ts">
	import { PLATE_ICONS } from '#helpers/card-plate-icons.ts';
	import type { PlateKind } from '#helpers/card-plate.ts';
	import Briefcase from '@lucide/svelte/icons/briefcase';

	interface Props {
		/** `PlateIdentity.emblem`: an energy type or a Trainer kind. */
		emblem: string;
		kind: PlateKind;
		/** Rings the emblem in gold, the way a Special Energy stands out from a basic one. */
		special?: boolean;
	}

	let { emblem, kind, special = false }: Props = $props();

	const Icon = $derived(PLATE_ICONS[emblem] ?? Briefcase);
</script>

<!-- A coin for an Energy and a rounded plaque for a Trainer, both filled with the plate's tint. -->
<div
	class={[
		'flex size-[40cqw] items-center justify-center border-[1cqw] bg-[radial-gradient(circle_at_30%_25%,var(--tint-a),var(--tint-b))] shadow-[0_2cqw_5cqw_rgb(0_0_0/0.5),inset_0_0_6cqw_rgb(0_0_0/0.3)] @max-[120px]:hidden',
		kind === 'energy' ? 'rounded-full' : 'rounded-[8cqw]',
		special ? 'border-gold-400/70' : 'border-white/35'
	]}
>
	<Icon class="size-[20cqw] text-white drop-shadow-[0_1cqw_1.5cqw_rgb(0_0_0/0.5)]" strokeWidth={kind === 'energy' ? 2.25 : 1.75} />
</div>

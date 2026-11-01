<script lang="ts">
	import type { PlateKind } from '#helpers/card-plate.ts';
	import type { LucideIcon } from '@lucide/svelte';
	import Backpack from '@lucide/svelte/icons/backpack';
	import Bone from '@lucide/svelte/icons/bone';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Cog from '@lucide/svelte/icons/cog';
	import Disc3 from '@lucide/svelte/icons/disc-3';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Eye from '@lucide/svelte/icons/eye';
	import Flame from '@lucide/svelte/icons/flame';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Gem from '@lucide/svelte/icons/gem';
	import HandFist from '@lucide/svelte/icons/hand-fist';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Leaf from '@lucide/svelte/icons/leaf';
	import Moon from '@lucide/svelte/icons/moon';
	import Rainbow from '@lucide/svelte/icons/rainbow';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Star from '@lucide/svelte/icons/star';
	import UserRoundStar from '@lucide/svelte/icons/user-round-star';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Zap from '@lucide/svelte/icons/zap';

	interface Props {
		/** `PlateIdentity.emblem`: an energy type or a Trainer kind. */
		emblem: string;
		kind: PlateKind;
		/** Rings the emblem in gold, the way a Special Energy stands out from a basic one. */
		special?: boolean;
	}

	let { emblem, kind, special = false }: Props = $props();

	const ICONS: Record<string, LucideIcon> = {
		ball: CircleDot,
		colorless: Star,
		darkness: Moon,
		dragon: Gem,
		fairy: Sparkles,
		fighting: HandFist,
		fire: Flame,
		fossil: Bone,
		grass: Leaf,
		item: Backpack,
		lightning: Zap,
		machine: Disc3,
		metal: Cog,
		potion: FlaskConical,
		psychic: Eye,
		rainbow: Rainbow,
		stadium: Landmark,
		supporter: UserRoundStar,
		tool: Wrench,
		trainer: Briefcase,
		water: Droplet
	};

	const Icon = $derived(ICONS[emblem] ?? Briefcase);
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

<script lang="ts">
	import { fly } from 'svelte/transition';
	import Modal from '@components/ui/Modal.svelte';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import GripIcon from '@lucide/svelte/icons/grip';
	import HashIcon from '@lucide/svelte/icons/hash';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
	import SaveIcon from '@lucide/svelte/icons/save';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';

	interface Props {
		showHelp: boolean;
		toggleHelp: () => void;
	}

	let { showHelp, toggleHelp }: Props = $props();

	const STEPS = [
		{ icon: GripIcon, text: 'Pick your pocket layout: 4, 9, 12 or 16.' },
		{ icon: LayersIcon, text: 'Fill the storage with a set, your collection, a URL or the header search.' },
		{ icon: MousePointerClickIcon, text: 'Drag a card onto a slot, or click the card then the slot.' },
		{ icon: DownloadIcon, text: 'Export the sheet and sleeve the real binder.' }
	];

	const TIPS = [
		{ icon: WandSparklesIcon, text: 'Auto-fill pours everything unplaced into the empty slots, adding pages as needed.' },
		{ icon: BookOpenIcon, text: 'Spread shows both facing pages, the way the binder opens.' },
		{ icon: HashIcon, text: 'Empty slots are numbered across the whole binder: that is the sleeving order.' },
		{ icon: EyeOffIcon, text: 'The eye button hides the cards already placed.' },
		{ icon: SaveIcon, text: 'Pages and storage stay in your browser.' }
	];
</script>

<Modal
	open={showHelp}
	onClose={toggleHelp}
	transitionFn={fly}
	transitionParams={{ y: 20, duration: 200 }}
	title="Binder Builder"
	containerClass="max-w-lg lg:max-w-2xl"
>
	<div class="flex flex-col gap-5 text-sm text-gray-200">
		<div class="grid gap-2 sm:grid-cols-2">
			{#each STEPS as step, index (step.text)}
				<div class="flex items-start gap-3 rounded-lg bg-gray-900/60 p-3">
					<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
						<step.icon size={16} />
					</span>
					<p><span class="mr-1 font-semibold text-gold-400">{index + 1}.</span>{step.text}</p>
				</div>
			{/each}
		</div>

		<ul class="flex flex-col gap-2">
			{#each TIPS as tip (tip.text)}
				<li class="flex items-center gap-3 text-gray-300">
					<tip.icon class="shrink-0 text-gold-400" size={16} />
					{tip.text}
				</li>
			{/each}
		</ul>
	</div>
</Modal>

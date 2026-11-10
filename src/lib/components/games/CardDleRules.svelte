<script lang="ts">
	import Button from '#components/filters/Button.svelte';
	import Modal from '#components/ui/Modal.svelte';
	import { CARD_DLE_MIN_PRICE } from '#helpers/card-dle.ts';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsDownIcon from '@lucide/svelte/icons/chevrons-down';
	import ChevronsUpIcon from '@lucide/svelte/icons/chevrons-up';
	import CircleEuroIcon from '@lucide/svelte/icons/circle-euro';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import GemIcon from '@lucide/svelte/icons/gem';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TagIcon from '@lucide/svelte/icons/tag';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		onClose: () => void;
		open: boolean;
	}

	let { onClose, open = $bindable() }: Props = $props();

	const steps = [
		{ detail: 'Type a Pokémon or card name to list the cards you can guess.', title: 'Search' },
		{ detail: 'Pick a card from the list with the mouse, or the arrow keys and Enter.', title: 'Select' },
		{ detail: 'Compare the seven coloured cells and guess again.', title: 'Read the row' }
	];

	const attributes = [
		{ detail: 'Character printed on the card', icon: PawPrintIcon, name: 'Pokémon' },
		{ detail: 'Illustrator credited on the card', icon: PaintbrushIcon, name: 'Artist' },
		{ detail: 'Set the card was printed in', icon: LibraryIcon, name: 'Set' },
		{ detail: 'How scarce this print is', icon: GemIcon, name: 'Rarity' },
		{ detail: 'Pokémon, Trainer or Energy', icon: LayersIcon, name: 'Supertype' },
		{ detail: 'Element: Fire, Water, Psychic...', icon: SparklesIcon, name: 'Type' },
		{ detail: 'Cardmarket value, in euros', icon: CircleEuroIcon, name: 'Price' }
	];

	const lists = [
		{
			icon: InfoIcon,
			items: [
				'A card with no energy type, like most Trainers, shows "No type".',
				`Only cards worth ${CARD_DLE_MIN_PRICE} € or more can be the mystery card.`,
				'A new mystery card is drawn every day at midnight UTC, your board is saved on this device until then.'
			],
			title: 'Good to know'
		},
		{
			icon: LightbulbIcon,
			items: [
				'Open with a popular Pokémon, Pikachu or Charizard cover a lot of sets.',
				'Follow the price arrows to jump between cheap and expensive prints.',
				'A green set means the answer is another card from that same set.'
			],
			title: 'Strategy'
		},
		{
			icon: SparklesIcon,
			items: [
				'Easy mode turns green tiles and price arrows into filters on the list.',
				'Winning on consecutive days builds a streak, it lasts until the end of the day after your last win.',
				'Share copies your guesses as a spoiler-free grid of coloured squares.'
			],
			title: 'Extras'
		}
	];
</script>

<!-- Wide rather than tall: on a laptop screen the whole rules sheet and its Got it button fit without scrolling. -->
<Modal bind:open containerClass="max-w-5xl" {onClose}>
	{#snippet header()}
		<h2 class="flex items-center gap-2 text-xl font-medium text-gold-400" id="modal-title">
			<Gamepad2Icon size={20} /> How to play Card.dle
		</h2>
	{/snippet}

	<div class="space-y-3 text-gray-300">
		<p class="text-sm text-gray-400">
			One mystery card per day, the same for everyone. Every guess compares seven attributes with it, so keep narrowing
			until they all turn green.
		</p>

		<section>
			<h3 class="mb-2 flex items-center gap-2 font-bold text-gold-400"><ClipboardListIcon size={16} /> Three steps</h3>
			<ol class="grid gap-3 sm:grid-cols-3">
				{#each steps as step, i (step.title)}
					<li class="relative rounded-lg border border-gray-700 bg-gray-900 p-3 pl-11">
						<span class="absolute top-3 left-3 flex size-6 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-black">{i + 1}</span>
						<p class="font-semibold text-white">{step.title}</p>
						<p class="mt-1 text-xs text-gray-400">{step.detail}</p>
					</li>
				{/each}
			</ol>
		</section>

		<section>
			<h3 class="mb-2 flex items-center gap-2 font-bold text-gold-400"><TagIcon size={16} /> The seven compared attributes</h3>
			<div class="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
				{#each attributes as attribute (attribute.name)}
					<div class="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
						<attribute.icon class="mt-0.5 shrink-0 text-gold-400" size={16} />
						<div>
							<p class="font-semibold text-white">{attribute.name}</p>
							<p class="text-xs text-gray-400">{attribute.detail}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h3 class="mb-2 flex items-center gap-2 font-bold text-gold-400"><PaletteIcon size={16} /> Reading a row</h3>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-green-600 text-xs font-semibold text-white"><CheckIcon size={14} /> Match</span>
					<p class="text-xs text-gray-400">Same value as the mystery card.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><XIcon size={14} /> Wrong</span>
					<p class="text-xs text-gray-400">Different value, look elsewhere.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><ChevronsUpIcon size={14} /> 15.99 €</span>
					<p class="text-xs text-gray-400">The mystery card costs more than your guess.</p>
				</div>
				<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-2.5">
					<span class="flex h-7 w-20 shrink-0 items-center justify-center gap-1 rounded-sm bg-red-600 text-xs font-semibold text-white"><ChevronsDownIcon size={14} /> 15.99 €</span>
					<p class="text-xs text-gray-400">The mystery card costs less than your guess.</p>
				</div>
			</div>
		</section>

		<div class="grid gap-3 md:grid-cols-3">
			{#each lists as list (list.title)}
				<section class="rounded-lg border border-gray-700 bg-gray-900 p-3">
					<h3 class="mb-2 flex items-center gap-2 font-bold text-gold-400"><list.icon size={16} /> {list.title}</h3>
					<ul class="space-y-1.5 text-sm">
						{#each list.items as item (item)}
							<li class="flex items-start gap-2"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-gold-400"></span> {item}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</div>

	{#snippet footer()}
		<Button class="px-4 py-2" onClick={onClose} title="Close the rules">
			<CheckIcon size={16} /> Got it
		</Button>
	{/snippet}
</Modal>

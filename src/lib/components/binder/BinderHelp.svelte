<script lang="ts">
	import Modal from '#components/ui/Modal.svelte';
	import ArrowRightLeftIcon from '@lucide/svelte/icons/arrow-right-left';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import GripIcon from '@lucide/svelte/icons/grip';
	import HashIcon from '@lucide/svelte/icons/hash';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import LinkIcon from '@lucide/svelte/icons/link';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
	import NotebookIcon from '@lucide/svelte/icons/notebook';
	import SaveIcon from '@lucide/svelte/icons/save';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';
	import WandSparklesIcon from '@lucide/svelte/icons/wand-sparkles';

	interface Props {
		onClose: () => void;
		open: boolean;
	}

	let { onClose, open }: Props = $props();

	const STEPS = [
		{ icon: LayoutGridIcon, text: 'Open Layout to pick your pocket layout (4, 9, 12 or 16) and turn the spread on or off.' },
		{ icon: LayersIcon, text: 'Build the tray: pick cards in Sets, Mine (your collection and wishlist) or All cards, paste image URLs, or use Add in the header search.' },
		{ icon: MousePointerClickIcon, text: 'Drag a card onto a slot, or click the card then the slot. Drag a placed card back onto the panel to return it to the tray.' },
		{ icon: DownloadIcon, text: 'Export the sheet and sleeve the real binder.' }
	];

	const TIPS = [
		{ icon: NotebookIcon, text: 'The binder menu at the start of the header switches between your binders, and renames, duplicates, deletes or adds one. Each has its own pages and tray, and a deleted binder comes back with Ctrl+Z until you switch to another.' },
		{ icon: LinkIcon, text: 'Share link, in that menu and for signed-in users, publishes a public read-only copy: anyone can find and open it, listed with your username, not only through its link. Cards added from an image URL are left out. Publish again replaces the link, and Unpublish removes it for good. The dialog lists all your shares.' },
		{ icon: EllipsisIcon, text: 'The ... menu on each page duplicates, empties, moves or deletes that page.' },
		{ icon: GripIcon, text: 'The strip under the sheets lists every page: click one to open it, drag one to reorder.' },
		{ icon: MenuIcon, text: 'Click a placed card, or right-click it, to open its menu: open the card page, move it to another slot, send it back to the tray, insert an empty slot or close the gap.' },
		{ icon: ArrowRightLeftIcon, text: 'To move a card without a mouse, choose Move to another slot in its menu, Tab to the destination and press Enter. Esc cancels.' },
		{ icon: KeyboardIcon, text: 'The arrow keys and PageUp / PageDown turn the pages, a spread turns two at a time. Enter opens the menu of the focused card, Delete removes it, Esc cancels a placement.' },
		{ icon: Undo2Icon, text: 'Nothing asks for confirmation: Ctrl+Z undoes it, Ctrl+Shift+Z redoes it.' },
		{ icon: EyeIcon, text: 'When you are signed in, Owned in the status line fades the cards you do not own and adds up what the rest costs.' },
		{ icon: WandSparklesIcon, text: 'Fill empty slots pours the list as shown, search and sort included and minus the cards already placed, into the empty slots, adding pages as needed. It is off above 1000 cards.' },
		{ icon: BookOpenIcon, text: 'Spread shows both facing pages, the way the binder opens. Phones show one page at a time.' },
		{ icon: HashIcon, text: 'Empty slots are numbered across the whole binder: that is the sleeving order.' },
		{ icon: EyeOffIcon, text: 'The eye button hides the cards already placed.' },
		{ icon: SaveIcon, text: 'Pages and the tray stay in your browser, apart from a binder you share.' }
	];
</script>

<Modal
	containerClass="max-w-lg lg:max-w-2xl"
	{onClose}
	{open}
	title="Binder Builder"
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

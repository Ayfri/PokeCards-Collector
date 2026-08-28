<script lang="ts">
	import Button from '@components/filters/Button.svelte';
	import NumberInput from '@components/filters/NumberInput.svelte';
	import BookUserIcon from '@lucide/svelte/icons/book-user';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LinkIcon from '@lucide/svelte/icons/link';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';

	interface Props {
		columns: number;
		onAddSet: () => void;
		onAddUrl: () => void;
		onExport: () => void;
		onMyCards: () => void;
		onResetAll: () => void;
		rows: number;
		spread: boolean;
	}

	let {
		columns = $bindable(),
		onAddSet,
		onAddUrl,
		onExport,
		onMyCards,
		onResetAll,
		rows = $bindable(),
		spread = $bindable()
	}: Props = $props();

	/** The pocket layouts real binders actually ship in. */
	const PRESETS = [
		{ columns: 2, label: '4', rows: 2 },
		{ columns: 3, label: '9', rows: 3 },
		{ columns: 3, label: '12', rows: 4 },
		{ columns: 4, label: '16', rows: 4 }
	];

	function applyPreset(preset: { columns: number; rows: number }) {
		rows = preset.rows;
		columns = preset.columns;
	}
</script>

<div class="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl bg-gray-800/60 p-3">
	<div class="flex flex-col gap-1">
		<span class="text-xs text-gray-300">Pocket layout:</span>
		<div class="flex gap-1">
			{#each PRESETS as preset (preset.label)}
				<Button
					class="h-8 px-2 text-xs"
					isActive={rows === preset.rows && columns === preset.columns}
					onClick={() => applyPreset(preset)}
					title="{preset.rows} x {preset.columns} pages, {preset.label} pockets"
				>
					{preset.label}-pocket
				</Button>
			{/each}
		</div>
	</div>

	<div class="flex w-40 items-end gap-2">
		<NumberInput id="rows" bind:value={rows} label="Rows:" max={8} min={1} />
		<NumberInput id="columns" bind:value={columns} label="Columns:" max={8} min={1} />
	</div>

	<Button isActive={spread} onClick={() => (spread = !spread)} title="Show both facing pages, the way the binder opens">
		<BookOpenIcon size={16} /> Spread
	</Button>

	<div class="ml-auto flex flex-wrap items-center gap-2">
		<Button onClick={onAddSet} title="Send a whole set to the storage">
			<LayersIcon size={16} /> Add set
		</Button>
		<Button onClick={onMyCards} title="Send your collection or wishlist to the storage">
			<BookUserIcon size={16} /> My cards
		</Button>
		<Button onClick={onAddUrl} title="Add cards from image URLs">
			<LinkIcon size={16} /> URL
		</Button>
		<Button onClick={onExport} title="Download the binder as a PNG">
			<DownloadIcon size={16} /> Export
		</Button>
		<Button onClick={onResetAll} title="Empty every page, keeping the storage">
			<RotateCwIcon size={16} /> Reset
		</Button>
	</div>
</div>

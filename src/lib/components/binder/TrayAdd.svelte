<script lang="ts">
	import Button from '#components/filters/Button.svelte';
	import TextArea from '#components/filters/TextArea.svelte';
	import { binder } from '#stores/binder.svelte.ts';
	import LinkIcon from '@lucide/svelte/icons/link';

	let text = $state('');
	let added = $state(0);

	/** One URL per line or separated by semicolons, so a pasted list works as it comes. A URL already in the tray is not counted, so the button never offers nothing. */
	const fresh = $derived([...new Set(text.split(/[\n;]/).map(url => url.trim().replace(/\.$/, '')).filter(url => /^https?:\/\//i.test(url)))].filter(url => !binder.tray.includes(url)));

	function add() {
		added = fresh.length;
		binder.addToTray(fresh);
		text = '';
	}
</script>

<details class="shrink-0 rounded-lg bg-gray-900/60 text-sm" ontoggle={() => (added = 0)}>
	<summary class="focus-ring flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-gray-300 hover:text-gold-400"><LinkIcon size={14} /> Paste image URLs</summary>
	<div class="flex flex-col gap-2 px-3 pb-3">
		<TextArea bind:value={text} class="max-h-32 overflow-y-auto" id="tray-urls" label="One URL per line, or separated by semicolons" placeholder="https://example.com/card.png" rows={3} />
		<div class="flex items-center justify-between gap-2">
			<span aria-live="polite" class="text-xs text-gray-400">{added ? `${added} added to the tray.` : ''}</span>
			<Button disabled={!fresh.length} onClick={add}>Add {fresh.length} to the tray</Button>
		</div>
	</div>
</details>

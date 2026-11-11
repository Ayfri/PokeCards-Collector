<script lang="ts">
	import TextInput from '#components/filters/TextInput.svelte';
	import Popover, { ITEM } from '#components/ui/Popover.svelte';
	import { MAX_NAME } from '#helpers/binder.ts';
	import { binder } from '#stores/binder.svelte.ts';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LinkIcon from '@lucide/svelte/icons/link';
	import NotebookIcon from '@lucide/svelte/icons/notebook';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { tick } from 'svelte';

	interface Props {
		onShare: () => void;
		/** Publishing needs a profile to put the share under, and only the shares of this account count as shared. */
		username?: string;
	}

	let { onShare, username }: Props = $props();

	const inputId = $props.id();
	let draft = $state('');
	let renaming = $state(false);
	let renameButton = $state<HTMLButtonElement>();

	function startRename() {
		draft = binder.active.name;
		renaming = true;
	}

	function selectField(input: HTMLInputElement) {
		input.focus();
		input.select();
	}

	/** The field leaves the page, so focus goes back to the button that opened it instead of to the document. */
	async function cancelRename() {
		renaming = false;
		await tick();
		renameButton?.focus();
	}

	function onKeydown(event: KeyboardEvent, close: () => void) {
		if (event.key === 'Enter') {
			binder.renameBinder(binder.activeId, draft);
			renaming = false;
			close();
		} else if (event.key === 'Escape') {
			/** The panel is a native popover, which closes on Escape unless the keydown is cancelled: a cancelled edit leaves the menu open. */
			event.preventDefault();
			cancelRename();
		}
	}
</script>

<!-- Before `binder.loaded` the store holds its pending binder, which is what the server and the first client render draw, so the actions wait for the real record. -->
<Popover class="w-72" label="Switch binder" onToggle={() => (renaming = false)} triggerClass="max-w-44 min-w-0 sm:max-w-60">
	{#snippet trigger()}
		<NotebookIcon class="shrink-0" size={16} />
		<span class="truncate">{binder.active.name}</span>
		<ChevronDownIcon class="shrink-0" size={16} />
	{/snippet}
	{#snippet children(close)}
		<ul class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
			{#each binder.binders as item (item.id)}
				{@const active = item.id === binder.activeId}
				{@const filled = item.pages.reduce((total, sheet) => total + sheet.filter(Boolean).length, 0)}
				<li>
					<button
						aria-current={active || undefined}
						class={[ITEM, active && 'bg-gray-700/50 font-semibold']}
						disabled={!binder.loaded}
						onclick={() => { binder.switchBinder(item.id); close(); }}
						type="button"
					>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="truncate">{item.name}</span>
							<span class="text-xs font-normal text-gray-400">{item.pages.length} page{item.pages.length > 1 ? 's' : ''}, {filled} filled</span>
						</span>
						{#if active}<CheckIcon class="shrink-0 text-gold-400" size={16} />{/if}
					</button>
				</li>
			{/each}
		</ul>

		<div class="mt-2 flex flex-col gap-0.5 border-t border-gray-700 pt-2">
			{#if renaming}
				<TextInput
					{@attach selectField}
					id={inputId}
					label="Binder name"
					maxlength={MAX_NAME}
					onkeydown={event => onKeydown(event, close)}
					bind:value={draft}
				/>
			{:else}
				<button bind:this={renameButton} class={ITEM} disabled={!binder.loaded} onclick={startRename} type="button"><PencilIcon size={16} /> Rename</button>
			{/if}
			<button class={ITEM} disabled={!binder.loaded} onclick={() => { binder.duplicateBinder(binder.activeId); close(); }} type="button"><CopyIcon size={16} /> Duplicate</button>
			<button
				class={ITEM}
				disabled={!binder.loaded || !username}
				onclick={() => { onShare(); close(); }}
				title={username ? undefined : 'Sign in to share a binder'}
				type="button"
			>
				<LinkIcon size={16} /> Share link
				{#if binder.shareOf(binder.activeId, username)}<span class="ml-auto text-xs text-gold-400">Shared</span>{/if}
			</button>
			<button class={ITEM} disabled={!binder.loaded} onclick={() => { binder.deleteBinder(binder.activeId); close(); }} type="button"><Trash2Icon size={16} /> Delete</button>
			<button class={ITEM} disabled={!binder.loaded} onclick={() => { binder.createBinder(); close(); }} type="button"><PlusIcon size={16} /> New binder</button>
		</div>
	{/snippet}
</Popover>

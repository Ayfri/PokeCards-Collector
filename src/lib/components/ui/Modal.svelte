<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		children?: import('svelte').Snippet;
		containerClass?: string;
		footer?: import('svelte').Snippet;
		header?: import('svelte').Snippet;
		onClose?: () => void;
		open?: boolean;
		title?: string;
	}

	let {
		children,
		containerClass = 'max-w-md',
		footer,
		header,
		onClose = () => {},
		open = $bindable(false),
		title = ''
	}: Props = $props();

	/** Focus moves into the dialog when it opens and back to the element that had it when it closes, so a page's own keys never act on the page behind the overlay. */
	function takeFocus(dialog: HTMLElement) {
		const opener = document.activeElement;
		dialog.focus();
		return () => {
			if (opener instanceof HTMLElement) opener.focus();
		};
	}
</script>

<svelte:window onkeydown={event => { if (open && event.key === 'Escape') onClose(); }} />

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
		onclick={event => { if (event.target === event.currentTarget) onClose(); }}
		role="presentation"
		transition:fade={{ duration: 200 }}
	>
		<div
			aria-labelledby="modal-title"
			aria-modal="true"
			class="bg-gray-800 border border-gray-700 rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto outline-none {containerClass}"
			role="dialog"
			tabindex="-1"
			{@attach takeFocus}
			transition:fly={{ duration: 200, y: 20 }}
		>
			{#if header || title}
				<div class="flex justify-between items-center mb-4">
					{#if header}{@render header()}{:else}
						{#if title}
							<h2 class="text-xl text-gold-400 font-medium" id="modal-title">{title}</h2>
						{/if}
					{/if}
					<button
						aria-label="Close modal"
						class="focus-ring text-gray-400 hover:text-white"
						onclick={onClose}
						title="Close (Esc)"
					>
						<XIcon size={20} />
					</button>
				</div>
			{/if}

			<div>
				{@render children?.()}
			</div>

			{#if footer}
				<div class="flex justify-end gap-3 mt-6">
					{@render footer?.()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		open?: boolean;
		title?: string;
		containerClass?: string;
		onClose?: () => void;
		header?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		containerClass = 'max-w-md',
		onClose = () => {},
		header,
		children,
		footer
	}: Props = $props();
</script>

<svelte:window onkeydown={event => { if (open && event.key === 'Escape') onClose(); }} />

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
		transition:fade={{ duration: 200 }}
		onclick={event => { if (event.target === event.currentTarget) onClose(); }}
		role="presentation"
	>
		<div
			class="bg-gray-800 border border-gray-700 rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto modal-content {containerClass}"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			{#if header || title}
				<div class="flex justify-between items-center mb-4">
					{#if header}{@render header()}{:else}
						{#if title}
							<h2 id="modal-title" class="text-xl text-gold-400 font-medium">{title}</h2>
						{/if}
					{/if}
					<button
						class="text-gray-400 hover:text-white"
						onclick={onClose}
						aria-label="Close modal"
						title="Close (Esc)"
					>
						<XIcon size={20} />
					</button>
				</div>
			{/if}

			<div class="modal-body">
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

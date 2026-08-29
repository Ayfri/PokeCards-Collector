<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, type FlyParams, type TransitionConfig } from 'svelte/transition';
	import XIcon from '@lucide/svelte/icons/x';
	import { browser } from '$app/environment';

	interface Props {
		open?: boolean;
		title?: string;
		transitionFn?: (node: Element, params: FlyParams) => TransitionConfig;
		transitionParams?: FlyParams;
		containerClass?: string;
		fullscreen?: boolean;
		onClose?: () => void;
		header?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		transitionFn = fly,
		transitionParams = { y: 20, duration: 200 },
		containerClass = 'max-w-md',
		fullscreen = false,
		onClose = () => {},
		header,
		children,
		footer
	}: Props = $props();

	
	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('keydown', handleKeydown);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('keydown', handleKeydown);
		}
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
		transition:fade={{ duration: 200 }}
		onclick={event => { if (event.target === event.currentTarget) onClose(); }}
		role="presentation"
	>
		<div
			class="bg-gray-800 border border-gray-700 rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto modal-content {containerClass} {fullscreen ? 'w-[95vw] h-[95vh] max-w-none max-h-none' : ''}"
			transition:transitionFn={transitionParams}
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

<style>
	/* Custom scrollbar for modal content */
	.modal-content::-webkit-scrollbar {
		width: 6px;
	}
	
	.modal-content::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.modal-content::-webkit-scrollbar-thumb {
		background-color: #4a4a4a; /* Slightly darker gray */
		border-radius: 20px;
		border: 3px solid transparent; /* Optional: creates padding around thumb */
	}
	
	.modal-content::-webkit-scrollbar-thumb:hover {
		background-color: #FFB700; /* Gold on hover */
	}
</style> 
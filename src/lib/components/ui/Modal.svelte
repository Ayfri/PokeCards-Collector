<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import XIcon from 'lucide-svelte/icons/x';

	export let open = false;
	export let title = '';
	export let transitionFn = fly; // Default transition
	export let transitionParams = { y: 20, duration: 200 }; // Default params

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			dispatch('close');
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
		transition:fade={{ duration: 200 }}
		on:click={() => dispatch('close')}
		role="presentation"
	>
		<div
			class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto modal-content"
			transition:transitionFn={transitionParams}
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			{#if $$slots.header || title}
				<div class="flex justify-between items-center mb-4">
					<slot name="header">
						{#if title}
							<h2 id="modal-title" class="text-xl text-gold-400 font-medium">{title}</h2>
						{/if}
					</slot>
					<button
						class="text-gray-400 hover:text-white"
						on:click={() => dispatch('close')}
						aria-label="Close modal"
					>
						<XIcon size={20} />
					</button>
				</div>
			{/if}

			<div class="modal-body">
				<slot />
			</div>

			{#if $$slots.footer}
				<div class="flex justify-end gap-3 mt-6">
					<slot name="footer" />
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
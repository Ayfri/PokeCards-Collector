<script lang="ts">
	import LoginForm from './LoginForm.svelte';
	import RegisterForm from './RegisterForm.svelte';
	import X from 'lucide-svelte/icons/x';
	import { fade, fly } from 'svelte/transition';

	export let isOpen = false;
	export let onClose: (() => void) | undefined = undefined;
	export let initialMode: 'login' | 'register' = 'login';
	
	let activeTab: 'login' | 'register' = initialMode;
	let modalContent: HTMLDivElement;

	$: if (isOpen) {
		activeTab = initialMode;
	}

	function closeModal() {
		isOpen = false;
		onClose?.();
	}

	function handleAuthSuccess() {
		closeModal();
	}

	function handleOverlayClick(event: MouseEvent) {
		if (modalContent && !modalContent.contains(event.target as Node)) {
			closeModal();
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		transition:fade={{ duration: 200 }}
		on:click={handleOverlayClick}>
		<div class="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden"
			bind:this={modalContent}
			transition:fly={{ y: 40, opacity: 0, duration: 250 }}>
			<div class="flex justify-between items-center p-4 border-b dark:border-gray-700">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
					{activeTab === 'login' ? 'Sign in' : 'Create an account'}
				</h2>
				<button 
					type="button" 
					class="text-gray-400 hover:text-gray-500 focus:outline-none"
					on:click={closeModal}
				>
					<X size={24} />
				</button>
			</div>
			<div class="p-4">
				<div class="flex border-b dark:border-gray-700 mb-4">
					<button 
						class="px-4 py-2 border-b-2 transition-colors {activeTab === 'login' 
							? 'border-red-500 text-red-500' 
							: 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
						on:click={() => activeTab = 'login'}
					>
						Sign in
					</button>
					<button 
						class="px-4 py-2 border-b-2 transition-colors {activeTab === 'register' 
							? 'border-red-500 text-red-500' 
							: 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
						on:click={() => activeTab = 'register'}
					>
						Register
					</button>
				</div>
				{#if activeTab === 'login'}
					<LoginForm onSuccess={handleAuthSuccess} />
				{:else}
					<RegisterForm onSuccess={handleAuthSuccess} onSwitch={(tab) => activeTab = tab} />
				{/if}
			</div>
		</div>
	</div>
{/if} 
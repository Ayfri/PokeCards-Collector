<script lang="ts">
	import LoginForm from './LoginForm.svelte';
	import RegisterForm from './RegisterForm.svelte';
	import Modal from '#components/ui/Modal.svelte';

	type Tab = 'login' | 'register';

	interface Props {
		initialMode?: Tab;
		onClose?: () => void;
		open?: boolean;
	}

	const TABS: { id: Tab; label: string }[] = [
		{ id: 'login', label: 'Sign in' },
		{ id: 'register', label: 'Register' },
	];

	let { initialMode = 'login', onClose, open = $bindable(false) }: Props = $props();

	let activeTab = $state<Tab>('login');

	$effect(() => {
		if (open) activeTab = initialMode;
	});

	function closeModal() {
		open = false;
		onClose?.();
	}
</script>

<Modal containerClass="mx-4 max-w-md" onClose={closeModal} {open} title={activeTab === 'login' ? 'Sign in' : 'Create an account'}>
	<div class="mb-4 flex gap-1 rounded-lg bg-gray-900/50 p-1">
		{#each TABS as tab (tab.id)}
			<button
				class={[
					'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-ring',
					activeTab === tab.id ? 'bg-gold-400/15 text-gold-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
				]}
				onclick={() => (activeTab = tab.id)}
				type="button"
			>
				{tab.label}
			</button>
		{/each}
	</div>
	{#if activeTab === 'login'}
		<LoginForm onSuccess={closeModal} />
	{:else}
		<RegisterForm onSuccess={closeModal} onSwitch={tab => (activeTab = tab)} />
	{/if}
</Modal>

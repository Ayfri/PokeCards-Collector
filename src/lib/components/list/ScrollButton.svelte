<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import { fade } from 'svelte/transition';

	interface Props {
		direction: 'down' | 'up';
		onclick: () => void;
		visible?: boolean;
	}

	let { direction, onclick, visible = true }: Props = $props();

	const Icon = $derived(direction === 'up' ? ChevronUpIcon : ChevronDownIcon);
	const label = $derived(`Scroll to ${direction === 'up' ? 'top' : 'bottom'}`);
</script>

{#if visible}
	<div transition:fade={{ duration: 300 }}>
		<button
			aria-label={label}
			class={[
				'fixed right-3 lg:right-6 size-12 z-30 opacity-50 border-white border-solid border-2 rounded-full bg-black text-white p-2 cursor-pointer transition-all ease-in-out duration-300 hover:scale-110 hover:opacity-100 flex items-center justify-center',
				direction === 'up' ? 'bottom-20 xs:bottom-24 lg:bottom-24' : 'bottom-6 xs:bottom-10 lg:bottom-8'
			]}
			{onclick}
			title={label}
		>
			<Icon size={24} />
		</button>
	</div>
{/if}

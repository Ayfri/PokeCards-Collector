<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		id: string;
		label: string;
	}

	let {
		checked = $bindable(false),
		disabled = false,
		id,
		label
	}: Props = $props();
</script>

<div class="flex items-center gap-2">
	<div class="relative">
		<input
			bind:checked
			class={[
				'appearance-none size-5 rounded border-2 bg-transparent transition-colors duration-200',
				checked ? 'border-gold-400 bg-gold-400/20' : 'border-white hover:border-gold-400',
				disabled ? 'opacity-50 cursor-not-allowed border-gray-600 hover:border-gray-600' : 'cursor-pointer',
			]}
			{disabled}
			{id}
			type="checkbox"
		/>
		{#if checked}
			<svg
				class={['absolute top-0 left-0 size-5 pointer-events-none', disabled ? 'text-gray-600' : 'text-gold-400']}
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="3"
				viewBox="0 0 20 20"
			>
				<path d="M4 10l4 4 8-8" />
			</svg>
		{/if}
	</div>
	<label
		class={['text-sm cursor-pointer select-none', disabled ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:text-gold-400']}
		for={id}
	>
		{label}
	</label>
</div>

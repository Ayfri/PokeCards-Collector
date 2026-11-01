<script lang="ts">
	interface Props {
		id: string;
		label: string;
		checked?: boolean;
		disabled?: boolean;
	}

	let {
		id,
		label,
		checked = $bindable(false),
		disabled = false
	}: Props = $props();
</script>

<div class="flex items-center gap-2">
	<div class="relative">
		<input
			type="checkbox"
			{id}
			bind:checked
			{disabled}
			class={[
				'appearance-none size-5 rounded border-2 bg-transparent transition-colors duration-200',
				checked ? 'border-gold-400 bg-gold-400/20' : 'border-white hover:border-gold-400',
				disabled ? 'opacity-50 cursor-not-allowed border-gray-600 hover:border-gray-600' : 'cursor-pointer',
			]}
		/>
		{#if checked}
			<svg
				class={['absolute top-0 left-0 size-5 pointer-events-none', disabled ? 'text-gray-600' : 'text-gold-400']}
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4 10l4 4 8-8" />
			</svg>
		{/if}
	</div>
	<label
		for={id}
		class={['text-sm cursor-pointer select-none', disabled ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:text-gold-400']}
	>
		{label}
	</label>
</div>

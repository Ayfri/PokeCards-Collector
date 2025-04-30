<script lang="ts">
	export let id: string;
	export let label: string;
	export let checked: boolean = false;
	export let disabled: boolean = false;
	
	let className: string = "";
	export { className as class };
</script>

<div class="flex items-center gap-2 {className}">
	<div class="relative">
		<input
			type="checkbox"
			{id}
			bind:checked
			{disabled}
			class="appearance-none w-5 h-5 rounded border-2 bg-transparent transition-colors duration-200
				{checked 
					? 'border-amber-400 bg-amber-400/20' 
					: 'border-white hover:border-amber-400'}
				{disabled ? 'opacity-50 cursor-not-allowed border-gray-600 hover:border-gray-600' : 'cursor-pointer'}"
		/>
		{#if checked}
			<svg 
				class="absolute top-0 left-0 w-5 h-5 text-amber-400 pointer-events-none {disabled ? 'text-gray-600' : ''}" 
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
		class="text-sm cursor-pointer select-none {disabled ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:text-amber-400'}"
	>
		{label}
	</label>
</div> 
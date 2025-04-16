<script lang="ts">
	export let isActive: boolean = false;
	export let onClick: () => void;
</script>

<button
	class="flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 flex-1 transition-all duration-200 text-white 
		   {isActive 
			? 'bg-amber-400 border-amber-400 text-black hover:bg-amber-500 hover:border-amber-500' 
			: 'border-white hover:bg-white hover:text-black'}"
	on:click={onClick}
>
	<slot />
</button>

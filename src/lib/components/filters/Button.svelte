<script lang="ts">
	export let isActive: boolean = false;
	export let onClick: () => void;
</script>

<button
	class="flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 flex-1 transition-all duration-200 text-white hover:bg-amber-400/20 hover:border-amber-400 {isActive ? 'bg-amber-400 border-amber-400 text-black' : 'border-white'}"
	on:click={onClick}
>
	<slot />
</button>

<script lang="ts">
	export let isActive: boolean = false;
	export let onClick: () => void;
</script>

<button
	class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 flex-1 transition-all duration-300 z-0
		   {isActive 
			? 'bg-amber-400 border-amber-400 text-black hover:bg-amber-500 hover:border-amber-500'
			: 'border-white text-white hover:text-black'}"
	on:click={onClick}
>
	<span class="relative z-10"><slot /></span>
</button>

<style>
	.animated-hover-button:not(.isActive)::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 0;
		background-color: white;
		transition: height 0.3s ease-in-out;
		z-index: 0;
	}

	.animated-hover-button:not(.isActive):hover::before {
		height: 100%;
	}
	
	.animated-hover-button span {
		position: relative;
		z-index: 1;
	}
	
	.animated-hover-button:not(.isActive) {
		transition: color 0.3s ease-in-out;
	}

	.animated-hover-button:not(.isActive):hover {
		color: black;
	}

	.animated-hover-button.isActive {
		/* Keep existing active styles or define new ones */
	}
</style>

<script lang="ts">
	export let isActive: boolean = false;
	export let onClick: () => void;
</script>

<button
	class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 flex-1 transition-all duration-300 z-0
		   {isActive 
			? 'border-[#FFB700] text-[#FFB700]'
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
		background-color: #FFB700;
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
		transition: color 0.3s ease-in-out, border-color 0.3s ease-in-out;
	}

	.animated-hover-button:not(.isActive):hover {
		color: black;
		border-color: #FFB700;
	}

	.animated-hover-button.isActive {
		/* Active state styles are now handled by Tailwind classes */
		/* No hover background change */
	}
</style>

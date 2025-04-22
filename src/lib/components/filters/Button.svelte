<script lang="ts">
	export let isActive: boolean = false;
	export let onClick: () => void;

	let classNames = '';
	export { classNames as class };
</script>

<button
	class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 flex-1 transition-all duration-300 z-0 hover:text-black
		   {isActive
			? 'border-[#FFB700] text-[#FFB700]'
			: 'border-white text-white hover:border-[#FFB700]'} {classNames}"
	on:click={onClick}
>
	<span class="relative z-10 flex items-center gap-2"><slot /></span>
</button>

<style>
	.animated-hover-button::before {
		background-color: #FFB700;
		bottom: 0;
		content: '';
		height: 0;
		left: 0;
		position: absolute;
		transition: height 0.3s ease-in-out;
		width: 100%;
		z-index: 0;
	}

	.animated-hover-button:hover::before {
		height: 100%;
	}
</style>

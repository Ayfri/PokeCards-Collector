<script lang="ts">

	interface Props {
		isActive?: boolean;
		onClick: () => void;
		disabled?: boolean;
		class?: string;
		/** Tooltip, and the accessible name when the button holds only an icon. */
		title?: string;
		children?: import('svelte').Snippet;
	}

	let {
		isActive = false,
		onClick,
		disabled = false,
		class: classNames = '',
		title = '',
		children
	}: Props = $props();

</script>

<button
	class="animated-hover-button relative overflow-hidden flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 transition-all duration-300 z-0 hover:text-black
		   {isActive
			? 'border-[#FFB700] text-[#FFB700]'
			: 'border-white text-white hover:border-[#FFB700]'}
		   {disabled ? 'opacity-50 cursor-not-allowed border-gray-600 text-gray-600 hover:text-gray-600 hover:border-gray-600' : ''}
		   {classNames}"
	onclick={onClick}
	disabled={disabled}
	title={title || undefined}
	aria-label={title || undefined}
>
	<span class="relative z-10 flex items-center gap-2">{@render children?.()}</span>
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

	.animated-hover-button:not(:disabled):hover::before {
		height: 100%;
	}
	
	.animated-hover-button:disabled::before {
		display: none;
	}
</style>

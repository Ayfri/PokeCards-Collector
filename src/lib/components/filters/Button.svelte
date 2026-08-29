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
	class="relative overflow-hidden flex items-center justify-center bg-transparent border-2 rounded text-sm py-1 px-3 h-8 transition-all duration-300 z-0 enabled:hover:text-black enabled:active:text-black
		   before:content-[''] before:absolute before:bottom-0 before:left-0 before:z-0 before:h-0 before:w-full before:bg-[#FFB700] before:transition-[height] before:duration-300 before:ease-in-out
		   enabled:hover:before:h-full enabled:active:before:h-full disabled:before:hidden
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

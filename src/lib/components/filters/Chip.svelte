<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		isActive: boolean;
		onClick: () => void;
	}

	let { children, isActive, onClick }: Props = $props();
</script>

<!-- px-1 and gap-1: "Darkness" and "Lightning" with their symbol must fit one of the four columns of the 450 px drawer untruncated. -->
<button
	aria-pressed={isActive}
	class={[
		'focus-ring flex h-7 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-sm border-2 px-1 text-xs transition-all duration-200',
		isActive ? 'border-gold-400 bg-gold-400/15 font-semibold text-gold-400' : 'border-white/30 text-white hover:border-gold-400',
	]}
	onclick={onClick}
	type="button"
>
	{@render children()}
</button>

<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let { onclick }: { onclick: () => void } = $props();
</script>

<button
	class="fixed right-3 lg:right-6 bottom-6 xs:bottom-10 lg:bottom-8 size-12 z-30 opacity-50 border-white border-solid border-2 rounded-full bg-black text-white p-2 cursor-pointer transition-all ease-in-out duration-300 hover:scale-110 hover:opacity-100 flex items-center justify-center"
	id="scroll-btn"
	{onclick}
	aria-label="Scroll to bottom"
	title="Scroll to bottom"
>
	<ChevronDownIcon size={24} />
</button>

<script lang="ts">
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';

	let { onclick }: { onclick: () => void } = $props();
</script>

<button
	class="fixed right-3 lg:right-6 bottom-20 xs:bottom-24 lg:bottom-24 size-12 z-30 opacity-50 border-white border-solid border-2 rounded-full bg-black text-white p-2 cursor-pointer transition-all ease-in-out duration-300 hover:scale-110 hover:opacity-100 flex items-center justify-center"
	id="scroll-top-btn"
	{onclick}
	aria-label="Scroll to top"
	title="Scroll to top"
>
	<ChevronUpIcon size={24} />
</button>

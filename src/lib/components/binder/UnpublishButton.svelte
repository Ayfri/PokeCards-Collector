<script lang="ts">
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	interface Props {
		/** A smaller button, for a row of a list. */
		compact?: boolean;
		disabled?: boolean;
		onConfirm: () => void;
	}

	let { compact = false, disabled = false, onConfirm }: Props = $props();

	/** Unpublishing is server side and cannot be undone, so the first click only arms the button, and it disarms itself after this long. */
	const ARMED_MS = 3000;

	let armed = $state(false);

	$effect(() => {
		if (!armed) return;
		const timer = setTimeout(() => (armed = false), ARMED_MS);
		return () => clearTimeout(timer);
	});

	function click() {
		if (!armed) {
			armed = true;
			return;
		}
		armed = false;
		onConfirm();
	}
</script>

<button
	class={[
		'focus-ring inline-flex items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
		compact ? 'px-2.5 py-1' : 'px-4 py-2',
		armed ? 'border-red-500 bg-red-500 text-white' : 'border-gray-600 text-gray-300 enabled:hover:border-red-400 enabled:hover:text-red-400'
	]}
	{disabled}
	onclick={click}
	type="button"
>
	<Trash2Icon size={16} />
	{armed ? 'Click again to unpublish' : 'Unpublish'}
</button>

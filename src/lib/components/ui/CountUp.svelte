<script lang="ts">
	import { run } from 'svelte/legacy';

	import { CountUp as CountUpJs, type CountUpOptions } from '$lib/countup-wrapper';
	import { onMount } from 'svelte';

	interface Props {
		duration?: number;
		end: number;
		start?: number;
		options?: CountUpOptions;
	}

	let {
		duration = 2,
		end,
		start = 0,
		options = {}
	}: Props = $props();

	let countUpAnim = $state<CountUpJs>();
	let spanElement = $state<HTMLSpanElement>();

	onMount(() => {
		if (!spanElement) return;

		countUpAnim = new CountUpJs(spanElement, end, {
			startVal: start,
			duration,
			...options,
		});

		if (!countUpAnim.error) {
			countUpAnim.start();
		} else {
			console.error(countUpAnim.error);
		}

		return () => {
			// Cleanup if necessary, although CountUp.js might not require explicit cleanup
		};
	});

	// Update the countUp animation when the end value changes
	run(() => {
		if (countUpAnim && end !== undefined) {
			countUpAnim.update(end);
		}
	});
</script>

<span bind:this={spanElement}>{start}</span> 
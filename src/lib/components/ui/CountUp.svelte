<script lang="ts">
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
	});

	// Update the countUp animation when the end value changes
	$effect(() => {
		countUpAnim?.update(end);
	});
</script>

<span bind:this={spanElement}>{start}</span> 
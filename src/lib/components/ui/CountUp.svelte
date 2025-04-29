<script lang="ts">
	import { CountUp as CountUpJs, type CountUpOptions } from '$lib/countup-wrapper';
	import { onMount } from 'svelte';

	export let duration = 2;
	export let end: number;
	export let start = 0;
	export let options: CountUpOptions = {};

	let countUpAnim: CountUpJs;
	let spanElement: HTMLSpanElement;

	onMount(() => {
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
	$: if (countUpAnim && end !== undefined) {
		countUpAnim.update(end);
	}
</script>

<span bind:this={spanElement}>{start}</span> 
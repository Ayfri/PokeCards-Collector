<script lang="ts">
	import { CountUp as CountUpJs, type CountUpOptions } from 'countup.js';
	import { onMount } from 'svelte';

	interface Props {
		duration?: number;
		end: number;
		options?: CountUpOptions;
	}

	let {
		duration = 2,
		end,
		options = {}
	}: Props = $props();

	let countUpAnim = $state<CountUpJs>();
	let spanElement = $state<HTMLSpanElement>();

	onMount(() => {
		if (!spanElement) return;

		countUpAnim = new CountUpJs(spanElement, end, {
			duration,
			...options,
		});

		if (!countUpAnim.error) {
			countUpAnim.start();
		} else {
			console.error(countUpAnim.error);
		}
	});

	$effect(() => {
		countUpAnim?.update(end);
	});
</script>

<span bind:this={spanElement}>0</span>
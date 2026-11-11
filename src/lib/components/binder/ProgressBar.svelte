<script lang="ts">
	interface Props {
		/** The fill colour, as a Tailwind background class. */
		fill: string;
		label: string;
		max: number;
		value: number;
	}

	let { fill, label, max, value }: Props = $props();
</script>

<span aria-label={label} aria-valuemax={max} aria-valuemin={0} aria-valuenow={value} class="inline-block h-1 w-16 shrink-0 overflow-hidden rounded-full bg-gray-700" role="progressbar">
	<span class={['block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200', fill]} style:width="{max ? (value / max) * 100 : 0}%"></span>
</span>

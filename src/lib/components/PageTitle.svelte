<script lang="ts">
	interface Props {
		title: string;
	}

	let { title }: Props = $props();
</script>

<div class="relative flex flex-col items-center w-fit text-nowrap font-bold">
	<div aria-hidden="true" class="absolute p-0 m-0 -top-7 max-md:-top-4 left-1/2 w-max max-w-[100vw] -translate-x-1/2 overflow-hidden -z-10 select-none text-7xl max-md:text-6xl max-xs:text-5xl leading-snug text-white opacity-10">{title}</div>
	<h1 class="p-0 m-0 text-white text-5xl max-md:text-4xl max-xs:text-3xl z-20 relative">{title}</h1>
</div>

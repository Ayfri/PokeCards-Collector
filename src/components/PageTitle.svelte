<script lang="ts">
	export let title: string;
</script>

<div class="relative flex flex-col items-center w-fit text-nowrap font-bold">
	<h1 class="absolute p-0 m-0 -top-10 max-md:-top-7 left-1/2 w-max max-w-[100vw] -translate-x-1/2 overflow-hidden -z-10 select-none text-8xl max-md:text-7xl max-xs:text-6xl !leading-snug text-white opacity-10">{title}</h1>
	<h2 class="p-0 m-0 text-white text-6xl max-md:text-5xl max-xs:text-4xl z-20 relative">{title}</h2>
</div>

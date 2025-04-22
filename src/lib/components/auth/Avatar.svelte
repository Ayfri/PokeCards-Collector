<script lang="ts">
	export let username: string;
	export let size: number = 8;
</script>

<div
	class="size-{size} rounded-full bg-gradient-to-tr from-red-500 to-purple-500 flex items-center justify-center text-white uppercase font-bold"
	class:text-xl={size >= 12 && size < 16}
	class:text-2xl={size >= 16 && size < 20}
	class:text-3xl={size >= 20}
>
	{username.charAt(0)}
</div>

<script lang="ts">
	export let username: string;
	export let size: string = "size-8 text-lg";
</script>

<div
	class="{size} rounded-full bg-gradient-to-tr from-yellow-700 to-gold-400 flex items-center justify-center text-white uppercase font-bold"
>
	{username.charAt(0)}
</div>

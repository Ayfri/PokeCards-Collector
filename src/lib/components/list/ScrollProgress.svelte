<script lang="ts">
	import { gridScroll } from '#stores/grid.svelte.ts';
</script>

<div class="relative z-10 h-[3px] w-full overflow-hidden max-lg:h-[2px]">
	<div class="absolute size-full bg-white/20"></div>
	<!-- Scaled rather than resized: `width` would relayout the bar on every scroll frame, `transform` stays on the compositor. -->
	<div
		class="absolute size-full origin-left bg-linear-to-r from-gold-400/80 via-gold-400 via-60% to-gold-500 shadow-[0_0_8px_1px] shadow-gold-400/70 transition-transform duration-200 ease-out will-change-transform max-lg:shadow-[0_0_6px_1px] max-lg:shadow-gold-400/60"
		style="transform: scaleX({gridScroll.progress / 100})"
	></div>
</div>

<script lang="ts">
	import { scrollProgress } from '$stores/scrollStore';
</script>

<div class="relative z-10 h-[3px] w-full overflow-hidden max-lg:h-[2px]">
	<div class="absolute size-full bg-white/20"></div>
	<!-- Scaled rather than resized: `width` would relayout the bar on every scroll frame, `transform` stays on the compositor. -->
	<div
		class="absolute size-full origin-left bg-linear-to-r from-[#ffd700cc] via-[#ffd700] via-60% to-[#ffc107] shadow-[0_0_8px_1px_#ffd700b3] transition-transform duration-200 ease-out will-change-transform max-lg:shadow-[0_0_6px_1px_#ffd70099]"
		style="transform: scaleX({$scrollProgress / 100})"
	></div>
</div>

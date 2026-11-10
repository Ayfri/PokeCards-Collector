<script lang="ts">
	import { TYPE_GLYPH_SCALE, TYPE_SYMBOLS } from '#helpers/tcg-symbols.ts';

	const OFFSET = 50 - 50 * TYPE_GLYPH_SCALE;
</script>

<!-- One symbol per type for `<TypeSymbol shared>`, drawn once per page. It is zero-sized instead of `display: none`, which stops browsers from resolving the gradients inside it. -->
<svg aria-hidden="true" class="pointer-events-none absolute size-0">
	<defs>
		{#each Object.entries(TYPE_SYMBOLS) as [key, glyph] (key)}
			<radialGradient cx=".3" cy=".25" id="type-gradient-{key}" r=".85">
				<stop offset="0" style="stop-color: var(--{key})" />
				<stop offset="1" style="stop-color: var(--{key}2)" />
			</radialGradient>
			<symbol id="type-symbol-{key}" viewBox="0 0 100 100">
				<circle cx="50" cy="50" fill="url(#type-gradient-{key})" r="47.5" stroke="rgb(255 255 255/0.5)" stroke-width="5" />
				<path d={glyph} fill="#0a0a0a" transform="translate({OFFSET} {OFFSET}) scale({TYPE_GLYPH_SCALE})" />
			</symbol>
		{/each}
	</defs>
</svg>

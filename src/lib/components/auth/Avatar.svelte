<script lang="ts">
	export let username: string;
	export let size: string = "size-8 text-lg";
	export let profileColor: string | null = null; // Expecting a hex color string e.g., "#RRGGBB"

	// Default gold colors
	const defaultColorStart = '#fbc54a'; // gold-400
	const defaultColorEnd = '#c08e1a';   // A darker gold, adjust as needed

	function darkenHexColor(hex: string, percent: number): string {
		hex = hex.replace(/^#/, '');
		let r = parseInt(hex.substring(0, 2), 16);
		let g = parseInt(hex.substring(2, 4), 16);
		let b = parseInt(hex.substring(4, 6), 16);

		r = Math.max(0, Math.floor(r * (1 - percent / 100)));
		g = Math.max(0, Math.floor(g * (1 - percent / 100)));
		b = Math.max(0, Math.floor(b * (1 - percent / 100)));

		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}

	$: gradientStyle = (() => {
		let startColor = defaultColorStart;
		let endColor = defaultColorEnd;

		if (profileColor && /^#[0-9A-Fa-f]{6}$/.test(profileColor)) {
			startColor = profileColor;
			endColor = darkenHexColor(profileColor, 45); // Accentue le dégradé (plus foncé)
		}
		return `background-image: linear-gradient(to bottom right, ${startColor}, ${endColor});`;
	})();
</script>

<div
	class="{size} rounded-full flex items-center justify-center text-white uppercase font-bold"
	style={gradientStyle}
>
	{username.charAt(0)}
</div>

<script>
	import { onMount } from 'svelte';
	import '../app.postcss';
	import * as d3 from 'd3-scale-chromatic';
</script>

<slot />

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
	:root {
		--font-main: 'Inter', sans-serif;
		/* --text-scaling: clamp(6rem, 8vw, 16rem);  Standard für alle Texte, Clamp macht min und max f. schriftgröße */
	}
</style>

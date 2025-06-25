<script>
	import { onMount } from 'svelte'; // store für Kommunikation
	//import Ideen2Ideengeber from "../components/Ideen2Ideengeber.svelte";
	import DataStory from '../components/DataStory.svelte';
	import Layout from '../components/Layout.svelte';
	import Sankey from '../components/sankey.svelte';
	import * as d3 from 'd3-scale-chromatic';
	import { writable } from 'svelte/store';
	import { scaleOrdinal } from 'd3';

	let allData = [];
	let catCount = [];
	let farbSkala;

	onMount(async () => {
		const res = await fetch('/ideengeber_data.json');
		allData = await res.json();
		//Den Fall "null" als Kategorie "ohne Kategorie" umwandeln und Kategorie = K.A.auch in die Kategorie "ohne Kategorie" umwandeln
		// @ts-ignore
		allData.forEach((item) => {
			if (item.kategorie === null) {
				item.kategorie = 'ohne Kategorie';
			}
			if (item.kategorie === 'K.A.') {
				item.kategorie = 'ohne Kategorie';
			}
		});

		//Kategorien gesamt zählen
		const frequencies = {};
		allData.forEach((item) => {
			const kat = item.kategorie;
			if (kat) {
				if (!frequencies[kat]) {
					frequencies[kat] = 0;
				}

				frequencies[kat]++;
			}
		});

		//Kategorien in Array umwandeln

		catCount = Object.entries(frequencies).map(([kategorie, count]) => ({
			kategorie,
			count
		}));

		//Farbskala erstellen
		const katSammlung = [...new Set(allData.map((d) => d.kategorie))];
		farbSkala = scaleOrdinal()
			.domain(katSammlung)
			// @ts-ignore
			.range(d3.schemeSet3);
	});
</script>

<main>
	{#if allData.length > 0}
		<Layout>
			<DataStory {allData} {catCount} {farbSkala} />
		</Layout>
	{:else}
		<p>Lade Daten...</p>
	{/if}
</main>

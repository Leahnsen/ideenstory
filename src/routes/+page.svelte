<script>
	// @ts-nocheck
	import { onMount } from 'svelte'; // store für Kommunikation
	//import Ideen2Ideengeber from "../components/Ideen2Ideengeber.svelte";
	import DataStory from '../components/DataStory.svelte';
	import Layout from '../components/Layout.svelte';
	import Sankey from '../components/sankey.svelte';
	import {schemeSet3} from 'd3-scale-chromatic';
	import { writable } from 'svelte/store';
	import { scaleOrdinal } from 'd3-scale';
	import { base } from '$app/paths';


	let allData = [];
	let sankeyData = [];
	let catCount = [];
	let farbSkala;

	onMount(async () => {
		const test = await fetch(`${base}/sankey.json`);
		sankeyData = await test.json();

		const res = await fetch(`${base}/ideengeber_data.json`);
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
			.range(schemeSet3);
	});
</script>

<main>
	{#if allData.length > 0}
		<Layout>
			<DataStory {allData} {catCount} {farbSkala} {sankeyData}/>
		</Layout>
	{:else}
		<p>Lade Daten...</p>
	{/if}
</main>

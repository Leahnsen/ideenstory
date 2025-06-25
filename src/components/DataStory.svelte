<script>
	// @ts-nocheck
	import Ideen2Ideengeber from './Ideen2Ideengeber.svelte';
	import Texte from './Texte.svelte';
	//import Annotations from './Annotations.svelte';
	import { json } from 'd3-fetch';
	import { onMount } from 'svelte';
	import Sankey from './sankey.svelte';
	import Layout from './Layout.svelte';
	import { writable } from 'svelte/store';
	import { scaleOrdinal } from 'd3-scale';
	import * as d3 from 'd3-scale-chromatic';
	import { color } from 'd3';

	// Props
	export let allData = [];
	export let catCount = [];
	export let farbSkala;
	let phaseLock = false;
	let combinedAnnotations = [];

	// Steuerung der Phasen
	export let phase = writable(0); 
	export let phaseSankey = writable(0); // 0–Sankey nicht gezeigt, ≥1 Sankey-Phasen

	// Gemeinsame SVG-Dimensionen
	let svgContainer;

	//Position des Texts nach Phase ändern
	let phaseTop;
	let phaseLeft;
	let width;
	let svgWidth;
	let svgHeight;

	onMount(() => {
		function handleResize() {
			svgWidth = window.innerWidth * 0.9;
			svgHeight = window.innerHeight * 0.8;
			//console.log("svgWidth data story", svgWidth);
			//console.log("svgHeight data story", svgHeight);
		}

		handleResize();
		window.addEventListener('resize', handleResize);
	});

	// Liste von Story-Schritten mit passenden Texten
	const storySteps = [
		//0 
		"<strong class='text-smblue'> Am Anfang waren Ideen. </strong> Smart City Bamberg startete im Jahr 2021 mit einer Ideensammlung für ein smartes Bamberg.",
		//1
		"Alle Bürger:innen konnten sich beteiligen und Probleme einreichen, die sie in Bamberg identifiziert hatten.",
		//2
		"Jede Idee ist als <strong> Quadrat </strong>dargestellt.",
		//3
		"Insgesamt wurden <strong> 268 </strong> Ideen abgegeben.",
		//4
		"Hinter diesem Quadrat steckt zum Beispiel: <dl class='space-y-2'><div><dt class='font-bold'>Idee:</dt><dd class='opacity-60'> Digitale Obstkarte zum Ernten</dd></div><div><dt class='font-bold'>Problem:</dt><dd class='opacity-60'>Es gibt viele öffentliche, aber auch private Obstbäume, die selten oder kaum geleert werden. Das ganze Obst fällt auf den Boden, wird faul und ist nicht mehr genießbar. </dd></div><div><dt class='font-bold'>Lösung:</dt><dd class='opacity-60'>Eine digitale Karte, auf der die Stellen verzeichnet sind, an denen in Bamberg Obst gepflückt werden darf und Beete der essbaren Stadt stehen.</dd></div></dl>",
		//5
		'<strong> 79 Menschen und Organisationen</strong> haben diese Ideen eingereicht.',
		//6
		"Im Schnitt reichten Bürger:innen <strong> 3,5 </strong> Ideen ein.",
		//7
		'Ein paar wenige sprudelten nur so vor Verbesserungsorschlägen: Hier gab jemand 39 Ideen an, die Bamberg zu einer smarteren Stadt machen könnten.',
		//8
		"Dahinter steckten verschiedene Themen, hier ein paar Beispiele:  <ul class='list-disc pl-5 space-y-1'><li class='opacity-60'> Zu hohe Wohnpreise</li><li class='opacity-60'>Warme Küche in Schulen/Kantinen und gesünder</li><li class='opacity-60'>Kotbeutelstationen</li></ul>", 
		//9
		'Apropos unterschiedliche Ideen - Smart City hat die Ideen kategorisiert nach Themengebieten.',
		//10
		"<strong class='text-hellgrün'>Grün</strong> sticht am meisten ins Auge: Dahinter stecken Ideen, die unter <strong class='text-hellgrün'>\"Serviceleistungen der Stadt\"</strong> fallen",
		//11
		"<span class='underline decoration-5 decoration-hellgrün'>66 Ideen gab es dazu.</span>",
		//12
		'<span class=\'underline decoration-5 decoration-hellgrün\'>\Wie zum Beispiel eine "Bürgerbeteiligungs-App"</span> und die Vision des <span class=\'underline decoration-5 decoration-hellgrün\'>"Aufbaus von geobasierten Digitalen Zwillingen".</span>',
		'<span class=\'underline decoration-5 decoration-hellgrün\'>\Wie zum Beispiel eine "Bürgerbeteiligungs-App"</span> und die Vision des <span class=\'underline decoration-5 decoration-hellgrün\'>"Aufbaus von geobasierten Digitalen Zwillingen".</span>',


	];

	function handlePhaseEnd() {
		if (phaseLock) return; // Verhindert doppelte Aufrufe innerhalb einer Phase
		phaseLock = true;

		phase.update((n) => n + 1);
		//console.log("phase after n+1", $phase);

		setTimeout(() => {
			phaseLock = false; // Nach kurzer Zeit wieder freigeben
		}, 2000);
	}

	$: {
		if (
			$phase === 1 ||
			$phase === 2 ||
			$phase === 4 ||
			$phase === 13 
		) {
			phaseTop = '20vh';
			phaseLeft = '20vw';
		} else if ($phase === 8 || $phase === 9 || $phase === 10 || $phase === 11) {
			phaseTop = '35vh';
			phaseLeft = '50vw';
    } else if ($phase === 0) {
      phaseTop = '20vh';
			phaseLeft = '30vw';
		} else if ($phase === 3) {
			phaseTop = '35vh';
			phaseLeft = '40vw';
    } else if ( $phase === 5 || $phase === 7 || $phase === 6){
			phaseTop = '20vh';
			phaseLeft = '60vw';

    } else if ($phase === 8) {
      phaseTop = '10vh';
      phaseLeft = '60vw';
		} else {
			phaseTop = '30vh';
			phaseLeft = '50vw';
		}
	}

	$: if ($phase < storySteps.length) {
		console.log('phase', $phase, storySteps.length);
		// Timer nur für Textphasen starten (keine D3 Animation vorhanden)
	if (![1, 4, 5, 6, 7, 9, 10, 13].includes($phase)) {
		console.log('phase', $phase);
	setTimeout(handlePhaseEnd, 4500);
}

		
	}


		
	
	//Story/Anmiationsmanager für Sankey

	const storyStepsSankey = [
		{//0
			text: 'Was kam nach den Ideen?<br> Das sehen wir uns jetzt an.',
			top: '15vh',
			left: '10vw'
		},
		{
			text: 'Das Team von Smart City entschied über deren Weiterentwicklung: <br> Welche Ideen können ausgebaut werden? Welche nicht?',
			top: '20vh',
			left: '20vw'
		},
		{//2 to Projektskizzen start
			text: 'Dabei wurden oft mehrere Ideen zu einem Projekt zusammengefasst. <br>So entstanden <strong>40 Projektskizzen.</strong>',
			top: '25vh',
			left: '50vw'
		},

		{//3 Label keine Projektskizze
			text: '<strong>203 Ideen</strong> wurden nicht weiterverfolgt, es gab keine Projektskizze.',
			top: '15vh',
			left: '59vw'
		},

		{//4
			text: 'Das sieht nach viel aus. Bedeutet aber auch, dass <strong>65 Ideen</strong> aus der Bevölkerung in die nächste Phase genommen wurden.',
			top: '60vh',
			left: '50vw'
		},
		
		{//5
			text: 'Wenn Ideen auf Eis gelegt wurden, hatte das häufig den Hintergrund, dass sie nicht zu den Smart City Kriterien passten.',
			top: '25vh',
			left: '65vw'
		},
		{//6 Highlight Idee === Outdoorgyms + Label Outdoorgyms
			text: '<strong>Outdoorgyms</strong> - das klingt für alle sinnvoll und fehlt in Bamberg.' ,
			top: '25vh',
			left: '70vw'
		},


		{//7 Highlight Idee === Outdoorgyms + Label Outdoorgyms
			text: 'Nichtsdestotrotz gab es dafür keine Projektskizze - denn bei Smart City geht es um digitale Ideen. Digital sind die Outdoorgyms aber nicht.',
			top: '25vh',
			left: '65vw'
		},
	
		{//8
			text: `2023 wurden die Projektskizzen nochmal weiter zusammengefasst. In <strong>4</strong> unterschiedliche Maßnahmen`, 
			top: '10vh',
			left: '60vw'
		},
		{//9  to Maßnahmen + Labels showMaßnahmen 
			text: ` 
				<span class="underline decoration-[#2b7ab7] decoration-8 text-white">Informieren</span>, 
				<span class="underline decoration-[#883582] decoration-8 text-white">Teilhaben</span>
				<span class="underline decoration-[#1c9741] decoration-8 text-white">Bewahren</span> und
				<span class="underline decoration-[#e73e20] decoration-8 text-white">Bewegen</span>.`,

			top: '15vh',
			left: '55vw'
		},

	
		{
		//10 vs 11 in Phasensteuerung Umsetzung start
			text: 'Jetzt kommen wir in der Gegenwart an.',
			top: '15vh',
			left: '55vw'
		},

		{//11
			text: 'Bis heute sind <strong>15 Projekte</strong> in die Praxisphase gestartet. Abgeschlossen ist noch keines.',
			top: '5vh',	
			left: '55vw'
		
		},
			//12 Hier & Jetzt Node anzeigen, Label
		{	text: 'Eines der Projekte heißt <strong>"Hier & Jetzt"</strong>. ',
			top: '60vh',
			left: '55vw'
		},
		{
			//13 hier & jetzt beschreiben
			text: '<strong>Hier & Jetzt</strong> wird eine Online-Karte für Bamberg. Sie zeigt bspw. barrierefreie Orte, Plätze für Familien, Veranstaltungen, Obstwiesen, Orte für die Jugend.',
			top: '56vh',
			left: '55vw'
		},

		{
			//14  Ideen Highlight ersten 3 Ideen
			text: "<strong>3 Ideen</strong> lieferten die Basis von Hier & Jetzt: <ul class='list-disc pl-5 space-y-1'><li class='opacity-60'> Eine Gärtnerstadt- und Gärtner App für Verbraucher und Touristen</li><li class='opacity-60'>Digitale Obstkarte zum Ernten</li><li class='opacity-60'>Digitale Verleihplattform </li></ul>", 
			top: '40vh',
			left: '15vw'
		},

		{ //15 nach Projektskizzen link //2. Phase highlight
			text: 'Dann wurden die Ideen zunächst getrennt weiterentwickelt. Eine <stron>regionale Lebensmittelplattform</strong> stand im Raum. Und die Enticklung eines <strong>Raum- und Materiallotsen</strong>.',
			top: '1vh',
			left: '50vw'
		},

 
		{
			// 16 Ideen Highlight zu Maßnahmen & Labels der Maßnahmen zeigen
			text: `Hier & Jetzt zahlt auf <span class="underline decoration-[#e73e20] decoration-8 text-white">Bewegen</span>. und
					<span class="underline decoration-[#883582] decoration-8 text-white">Teilhaben</span>`, 
			top: '10vh',
			left: '55vw'
		},

		{
			// 17drawto Umsetzung start
			text: 'Wenn <strong>Hier & Jetzt</strong> abgeschlossen ist,  soll man ausgehend vom eigenen Standort kann man direkt auf einer Karte sehen, was in der Nähe geboten wird - und zwar jenseits von Google Maps Wissen, basierend auf lokalem Bamberger:innen Wissensschatz.',
			top: '1vh',
			left: '50vw'
		},


	];

		//const storyDelays = [5000, 5000, 7000, 4000, 6000, 8000, 5000, 6000, 5000];
	$: if ($phase === storySteps.length && $phaseSankey <= storyStepsSankey.length){
				console.log("phaseSankey", $phaseSankey);
				setTimeout(handleSankeyPhaseEnd, 4500);
			}
		

	let phaseLock2 = false;

	function handleSankeyPhaseEnd() {
			//console.log("handleSankey before n+1 & retzrn", $phaseSankey);
			if (phaseLock2) return; // Verhindert doppelte Aufrufe innerhalb einer Phase
			phaseLock2 = true;
			 //console.log("phaseSankeyds beforw n+1", $phaseSankey);

			phaseSankey.update((n) => n + 1);
			//console.log("phaseSankeyds after n+1", $phaseSankey);

			setTimeout(() => {
				phaseLock2 = false; // Nach kurzer Zeit wieder freigeben
			}, 2000);
				

	}



	//Objekt für Annotations für jede Stage im Sankey
	const sankeyAnnotations = [
	{
		stage: 'Idee',
		showPhase: 1,
		text: '<strong>2021:<br>Ideen</strong>'
	},
	{
		stage: 'Projektskizze',
		showPhase: 3,
		text: '<strong>2022:<br>Projektskizzen</strong>',

	},
	{
		stage: 'Maßnahme',
		showPhase: 9,
		text: '<strong>2023:<br>Maßnahmen</strong>'
	},
	{
		stage: 'Umsetzungsprojekt',
		showPhase: 11,
		text: '<strong>Seit 2024:<br>Umsetzung</strong>'
	},

	];

</script>

<main class="relative w-full flex flex-col items-center justify-start pt-6 px-6">
	<div class="w-full flex-grow min-h-0 pt-20 overflow-visible">
		<!--  einziger SVG-Container für beide Components-->
		{#if svgWidth && svgHeight}
			<svg
				bind:this={svgContainer}
				viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				preserveAspectRatio="none"
				class="svg-container overflow-visible"
			>
				{#if svgContainer}
					{#if $phase <= 13}
						<Ideen2Ideengeber
							container={svgContainer}
							{svgHeight}
							{svgWidth}
							{allData}
							{catCount}
							{farbSkala}
							phase={$phase}
							on:phaseEnd={handlePhaseEnd}
						/>
					{/if}

					{#if $phaseSankey <= 19}
						<Sankey
							container={svgContainer}
							{allData}
							{farbSkala}
							phaseSankey={$phaseSankey}
							{svgHeight}
							{svgWidth}
							on:phaseSankeyEnd={handleSankeyPhaseEnd}
							sankeyAnnotations={sankeyAnnotations}
							bind:combinedAnnotations

						/>
					{/if}
				{/if}
			</svg>
		{/if}

		<!-- Texte als Overlay außerhalb des SVG -->
		{#if $phase < storySteps.length}
			{#key $phase}
				<Texte
					text={storySteps[$phase]}
					top={phaseTop}
					left={phaseLeft}
				/>
			{/key}
		{/if}

		{#if $phase === storySteps.length && $phaseSankey <= 18}
			{#key $phaseSankey}
				{#if storyStepsSankey[$phaseSankey]}
					<Texte
						text={storyStepsSankey[$phaseSankey].text}
						top={storyStepsSankey[$phaseSankey].top}
						left={storyStepsSankey[$phaseSankey].left}
						annotations={combinedAnnotations}
						phase= {$phaseSankey}
					/>
				{/if}
				
			{/key}
		{/if}
	</div>
</main>

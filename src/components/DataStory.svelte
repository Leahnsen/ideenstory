<script>
	// @ts-nocheck
	import Ideen2Ideengeber from './Ideen2Ideengeber.svelte';
	import Texte from './Texte.svelte';
	import AnnotationSankey from './AnnotationSankey.svelte';
	import EndAnimation from './EndAnimation.svelte';
	//import Annotations from './Annotations.svelte';
	import { onMount } from 'svelte';
	import Sankey from './sankey.svelte';
	import Layout from './Layout.svelte';
	import { writable } from 'svelte/store';
	import { scaleOrdinal } from 'd3-scale';
	import {schemeSet3} from 'd3-scale-chromatic';
	import { base } from '$app/paths';


	// Props
	export let allData = [];
	export let catCount = [];
	export let sankeyData = [];
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



//console.log("SankeyData", sankeyData);
  // z.B. zieh dir hier schon die Sets:
  const ideenSet   = new Set(sankeyData.map(d=>d.idee).filter(x => Boolean(x)));
  const sketchSet  = new Set(sankeyData.map(d=>d.projektskizze).filter(s => s && !s.toLowerCase().includes('keine')));
  const projectSet = new Set(sankeyData.map(d=>d.umsetzungsprojekt).filter(s => s && !s.toLowerCase().includes('keine')));





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
		 
		{
			text:"<strong class='text-smblue'> Am Anfang waren Ideen. </strong> Smart City Bamberg startete im Jahr 2021 mit einer Ideensammlung für ein smartes Bamberg. Jede:r konnte teilnehmen.", 
			image:"/icons/idee.png",
			showPhase: 1,
			top: "20vh", 
			left: "20vw"
		},
		
		{	
			text:`Insgesamt wurden <strong> ${ideenSet.size}</strong> Ideen abgegeben.`,
			image: null,
			showPhase: 2,
			top: "39vh", 
			left: "45vw"
		},

		{
			text:"Hinter diesem Quadrat steckt zum Beispiel: <dl class='space-y-2'><div><dt class='font-bold'>Idee:</dt><dd class='opacity-60'> Digitale Obstkarte zum Ernten</dd></div></dl>",
			image: "/icons/hier-jetzt.png",
			showPhase: 3,
			top: "10vh", 
			left: "37vw"
		},

		{
			text:"<dl class='space-y-2'><div><dt class='font-bold'>Idee:</dt><dd class='opacity-60'> Eine Website mit Veranstaltungen für Kinder</dd></div> </dl>",
			image: "/icons/teilhaben-ferienportal.svg",
			showPhase: 4,
			top: "40vh", 
			left: "40vw"
		},
		
		{
			text:"Und hier eher was für Erwachsene: <dl class='space-y-2'><div><dt class='font-bold'>Idee:</dt><dd class='opacity-60'> Digitale Verleihplattform & Nachbarschaften verbinden</dd></div> </dl>",
			image: "/icons/teilhaben-raum-materiallotse.svg",
			showPhase: 5,
			top: "6vh", 
			left: "37vw"
		},
		
		{
			text:'<strong> 76 Menschen und Organisationen</strong> haben diese Ideen eingereicht.',
			showPhase: 7,
			top: "25vh", 
			left: "55vw"
		},
		
		{
			text:"Im Schnitt kamen von Teilnehmenden <strong> 3,5 </strong> Ideen.",
			image: null,
			showPhase: 8,
			top: "20vh", 
			left: "55vw"
		},
		
		{
			text:'Die Ideen zielten auf verschiedene Themengebiete ab.',
			image: null,
			showPhase: 9,
			top: "35vh", 
			left: "60vw"
		},

		{
			text:"Für welches Themengebiet gab es wohl am meisten Ideen zur Verbesserung?",
			image: null,
			showPhase: 10,
			top: "5vh", 
			left: "60vw"
		},

		{
			text:"<strong class='text-orange'>Orange!</strong>",
			image: null,
			showPhase: 11,
			top: "35vh", 
			left: "62vw"
		},
		
		{
			text:"<strong class='text-orange'>Orange</strong> stehr für smartere <strong class='text-orange'>\'Serviceleistungen in der Stadt\'</strong>.",
			image: null,
			showPhase: 13,
			top: "1vh", 
			left: "55vw"
		},
		
		{ 
			text:"Die <strong>digitale Obstkarte</strong> von vorhin fällt unter <strong class='text-türkis'>\'Umwelt\'</strong>.",
			image: "/icons/hier-jetzt.png",
			showPhase: 14,
			top: "38vh", 
			left: "50vw"
		},
		//{ text:'<span class=\'underline decoration-5 decoration-hellgrün\'>\Wie zum Beispiel eine "Bürgerbeteiligungs-App"</span> und die Vision des <span class=\'underline decoration-5 decoration-hellgrün\'>"Aufbaus von geobasierten Digitalen Zwillingen".</span>',	image: null},


	];
	



  // reaktives Ableiten des aktuellen Story-Index
  //$: storyIndex = phaseTextMap[$phase] ?? null;
  //$: storyIndex = phaseTextMap[$phase] ?? null;
  // hier holen wir uns das Objekt oder ein Default:
  //$: currentItem = storyIndex !== null
   //// : { text: "", image: null };

	function handlePhaseEnd() {
		if (phaseLock) return; // Verhindert doppelte Aufrufe innerhalb einer Phase
		phaseLock = true;

		phase.update((n) => n + 1);
		//console.log("phase after n+1", $phase);

		setTimeout(() => {
			phaseLock = false; // Nach kurzer Zeit wieder freigeben
		}, 2000);
	}

	
	$: if ($phase <16) {
		//console.log('phase', $phase, storySteps.length);
		// Timer nur für Textphasen starten (keine D3 Animation vorhanden)
	if (![1, 3, 4, 5, 6, 8, 9, 12, 14,15].includes($phase)) {
	
		//console.log('phaseBEDINGUNG POSITIV', $phase);
	setTimeout(handlePhaseEnd, 5000);
}

		
	}


		
	
	//Story/Anmiationsmanager für Sankey

	const storyStepsSankey = [
		{
			showPhase: 1,
			text: '<strong>Was wurde aus den Ideen?</strong><br> Das sehen wir uns jetzt an.',
			top: '35vh',
			left: '40vw'
		},

		{
			//  Ideen Highlight ersten 3 Ideen
			showPhase: 5,
			text: "Ähnliche Ideen wurden in gemeinsame Skizzen gebündelt. Das sieht man an den Knoten, auf die oft mehrere Ideen zulaufen.",
			top: '50vh',
			left: '55vw'
		},

		{
			showPhase: null,
			text: "So wurden aus 65 Ideen 27 Skizzen.",
			top: '35vh',
			left: '50vw'
		},
	
		{//3 Label keine Projektskizze
			showPhase: 6,
			text: '<strong>180 Ideen</strong> wurden nicht weiterverfolgt. Warum nicht?',
			top: '37vh',
			left: '50vw'
		},

		{//6 Highlight Idee === Outdoorgyms + Label Outdoorgyms
			showPhase: 8,
			text: 'Ein Beispiel: <strong>Fitnessgeräte im Freien</strong> - das klingt sinnvoll, das gibt es in Bamberg nur am Volkspark.' ,
			image: "/icons/outdoorgyms.png",
			top: '13vh',
			left: '55vw'
		},


		{//7 Highlight Idee === Outdoorgyms + Label Outdoorgyms
			showPhase: 9,
			text: 'Aber bei Smart City geht es um digitale Ideen. Daher hat man die Idee nicht weiterverfolgt.',
			image: "/icons/outdoorgyms.png",
			top: '10vh',
			left: '55vw'
		},

		{
			showPhase: 10,
			text: 'Im Projekt <strong> Hier & Jetzt</strong> finden wir unsere Ideen von vorhin wieder und befinden sich gerade in der Umsetzung.',
			image: "/icons/hier-jetzt.png",
			top: '35vh',
			left: '50vw'
		},
		{
			
			showPhase: 11,
			text: '<strong>Hier & Jetzt</strong> wird eine Online-Karte für Bamberg. Sie zeigt bspw. barrierefreie Orte, Plätze für Familien, Veranstaltungen, Obstwiesen, Orte für die Jugend.',
			image: "/icons/hier-jetzt.png",
			top: '35vh',
			left: '55vw'
		},

		{
			showPhase: 12,
			text: 'Wenn <strong>Hier & Jetzt</strong> abgeschlossen ist, kann man auf einer Karte sehen, was in der Nähe geboten wird, basierend auf lokalem Bamberger:innen Wissensschatz.',
			image: "/icons/hier-jetzt.png",
			top: '20vh',
			left: '50vw'
		},

		{
			showPhase: 13,
			text: 'Bis heute sind <strong>20 Projekte</strong> in die Umsetzung gestartet.',
			top: '25vh',	
			left: '50vw'
		
		},

				{
			showPhase: 13,
			text: 'Bald kann man sie in Bamberg erleben.',
			top: '25vh',	
			left: '50vw'
		
		},

	];

	// Triggert nur, wenn es neuen Text gibt. 
	$: currentSankeyStep = storyStepsSankey.find(s => s.showPhase === $phaseSankey) ?? null;
	//$: console.log('currentSankeyStep', currentSankeyStep);
	$: currentIdeengeberStep = storySteps.find(s => s.showPhase === $phase) ?? null;


$: console.log('phaseSankey ist jetzt', $phaseSankey);
$: console.log('phaseIDeen ist jetzt', $phase);


		//const storyDelays = [5000, 5000, 7000, 4000, 6000, 8000, 5000, 6000, 5000];
$: if ($phase === 16 
    && $phaseSankey <= 16  
    && ![2,3,4,5, 6, 7,9,10,13, 14, 15].includes($phaseSankey)) {
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
		text: '<strong>2021: Ideen</strong>'
	},
	{
		stage: 'Projektskizze',
		showPhase: 2,
		text: '<strong>2022: Skizzen</strong>',

	},
	{
		stage: 'Umsetzungsprojekt',
		showPhase: 14,
		text: '<strong>2025: Umsetzung</strong>'
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
					{#if $phase <= 16}
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

					{#if $phaseSankey <= 16}
						<Sankey
							container={svgContainer}
							{allData}
							phaseSankey={$phaseSankey}
							{svgHeight}
							{svgWidth}
							on:phaseSankeyEnd={handleSankeyPhaseEnd}
							sankeyAnnotations={sankeyAnnotations}
							bind:combinedAnnotations

						/>
					{/if}

					{#if $phaseSankey >16}
						<EndAnimation 
							container={svgContainer}
							{ideenSet}
							{sketchSet}
							{projectSet}
							{svgHeight}
							{svgWidth}
							on:finished={() => {
								phase.set(0);
								phaseSankey.set(0);
								}}
						/>
					{/if}
				{/if}
			</svg>
		{/if}

		<!-- Texte als Overlay außerhalb des SVG -->
			{#if currentIdeengeberStep}
			{#key currentIdeengeberStep.showPhase}
				<Texte
				text={currentIdeengeberStep.text}
				image={currentIdeengeberStep.image}
				top={currentIdeengeberStep.top}
				left={currentIdeengeberStep.left}
				/>
			{/key}
			{/if}

		{#if $phase === 16 && $phaseSankey <17}
			<AnnotationSankey
				annotations={combinedAnnotations}
				phase={$phaseSankey}
			/>
		{/if}

<!-- currentSankeyStep nur vorhanden, wenn es einen Text gibt	 -->
		{#if $phase === 16 && currentSankeyStep}
			{#key currentSankeyStep.showPhase}
				<!--{#if storyStepsSankey[$phaseSankey]}-->
					<Texte
						text={currentSankeyStep.text}
						top={currentSankeyStep.top}
						left={currentSankeyStep.left}
						image={currentSankeyStep.image}
						phase= {$phaseSankey}
					/>
				<!--{/if}-->
			{/key}
		{/if}



	</div>
</main>

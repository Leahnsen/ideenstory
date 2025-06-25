<script>
	// @ts-nocheck
	import { createEventDispatcher, onMount } from 'svelte';
	import { json } from 'd3-fetch';
	import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
	import { scaleOrdinal } from 'd3-scale';
	import { get } from 'svelte/store';
	import { writable } from 'svelte/store';
	import { transition } from 'd3-transition';
	import { select } from 'd3-selection';
	import { easeLinear, easeCubicIn } from 'd3-ease';
	import { draw, fade, slide } from 'svelte/transition';
	import { bin, reduce } from 'd3';
	import { tick } from 'svelte';
	//import Annotations from './Annotations.svelte';

	export let farbSkala;
	export let allData;
	export let phaseSankey;
	export let container;
	export let svgWidth;
	export let svgHeight;

	const dispatch = createEventDispatcher();

	let rawData = [];
	let sankeyData = { nodes: [], links: [] };
	//let width= 2000;
	//let height= 3400;
	let sankeyGenerator;
	// vier Stationen definieren
	const stages = ['Idee', 'Projektskizze', 'Maßnahme', 'Umsetzungsprojekt'];

	export let sankeyNodeMap = {};

	$: if (sankeyDataReady) {
		sankeyNodeMap = {};
		sankeyDataReady.nodes.forEach((node) => {
			if (node.stage === 'Idee') {
				sankeyNodeMap[node.name] = { x: node.x0, y: node.y0 };
			}
		});
	}

	//Vorverarbeitung für die Farbkategorien

	function getcolorForIdea(idee) {
		let ideeEintrag = allData.find((d) => d.idee === idee);
		//console.log(` Farbe für Idee "${idee}":`, ideeEintrag?.kategorie, "→", farbSkala(ideeEintrag?.kategorie));
		return ideeEintrag ? farbSkala(ideeEintrag.kategorie) : '#888';
	}

	// Einzelne Idee hervorheben
	let activeIdea = null; //  Speichert die aktuell hervorgehobene Idee

	function highlightIdea(ideaName) {
		activeIdea = ideaName;
	}



	function isPartOfHighlightedPath(node) {
		return activeIdea && node.originalIdea === activeIdea;
	}

	function isLinkHighlighted(link) {
		return activeIdea && link.source.originalIdea === activeIdea;
	}

	function getColorForMeasure(measure) {
		if (!measure || measure.includes('Keine Maßnahme')) return '#888'; // Grau für "Keine Maßnahme"

		const measureColors = {
			Bewegen: '#e73e20',
			Informieren: '#2b7ab7',
			Teilhaben: '#883582',
			Bewahren: '#1c9741'
		};

		return measureColors[measure];
	}

	onMount(async () => {
		const svg = select(container);

		rawData = await json('/sankey.json');

		// Mapping von Ideen zu Kategorien erstellen
		let ideaToCategory = {};
		allData.forEach((record) => {
			if (record.idee) {
				ideaToCategory[record.idee] = record.kategorie || 'Ohne Kategorie';
			}
		});

		// Ideen nach Kategorie gruppieren
		let groupedIdeas = {};
		rawData.forEach((record) => {
			let category = ideaToCategory[record.idee] || 'Ohne Kategorie'; // Kategorie aus Mapping holen
			if (!groupedIdeas[category]) groupedIdeas[category] = [];
			groupedIdeas[category].push(record);
		});

		// Sortierte Nodes nach Kategorie erstellen
		let nodes = [];
		let nodesMap = {};

		Object.keys(groupedIdeas).forEach((category) => {
			groupedIdeas[category].forEach((record) => {
				let value = record.idee;
				if (value !== undefined && value !== null && value !== '') {
					let key = `Idee:${value}`;
					if (!nodesMap[key]) {
						let node = {
							id: key,
							name: value,
							stage: 'Idee',
							category: category,
							originalIdea: value
						};
						nodes.push(node);
						nodesMap[key] = nodes.length - 1;
					}
				}
			});
		});

		// Stages hinzufügen (Projektskizze, Maßnahme, Umsetzung)
		stages.slice(1).forEach((stage, i) => {
			let values = new Set();
			rawData.forEach((record) => {
				let value;
				if (i === 0) value = record.projektskizze;
				else if (i === 1) value = record.maßnahme;
				else if (i === 2) value = record.umsetzungsprojekt;
				if (value !== undefined && value !== null && value !== '') {
					values.add(value);
				}
			});

			values.forEach((val) => {
				let splittedValue = splitValue(val, stage);

				splittedValue.forEach((splittedval) => {
					let key = `${stage}:${splittedval}`;

					if (nodesMap[key] === undefined) {
						let originalIdea = null; // Wird später durch die Links übernommen
						let node = { id: key, name: splittedval, stage: stage, originalIdea: originalIdea };
						nodes.push(node);
						nodesMap[key] = nodes.length - 1;
					}
				});
			});
		});

		// Erstelle Links: Jeder Datensatz erzeugt einen Fluss von Station zu Station.
		// Dabei wird im Übergang in die nächste Station geprüft, ob das Feld mehrere Werte enthält.
		function splitValue(val, stage) {
			if (stage === 'Maßnahme' || (stage === 'Umsetzungsprojekt' && val.includes(','))) {
				let parts = val.split(',').map((s) => s.trim()); // wenn Maßnahme, dann kommaseparierte Werte
				return parts;
			}
			return [val]; // Falls kein Komma, dann nur ein Eintrag wie zuvor
		}

		// Erstelle Links: Jeder Datensatz erzeugt einen Fluss von Station zu Station.
		let rawLinks = [];
		rawData.forEach((record) => {
			let flow = [
				{ stage: 'Idee', value: record.idee },
				{ stage: 'Projektskizze', value: record.projektskizze },
				{ stage: 'Maßnahme', value: record.maßnahme },
				{ stage: 'Umsetzungsprojekt', value: record.umsetzungsprojekt }
			];

			// Für jede benachbarte Station
			for (let i = 0; i < flow.length - 1; i++) {
				// Ursprungswerte aufsplitten
				let sourceVals = splitValue(flow[i].value, flow[i].stage);
				// Zielwerte aufsplitten
				let targetVals = splitValue(flow[i + 1].value, flow[i + 1].stage);

				sourceVals.forEach((sv) => {
					targetVals.forEach((tv) => {
						if (sv && tv) {
							let sourceKey = `${flow[i].stage}:${sv}`;
							let targetKey = `${flow[i + 1].stage}:${tv}`;

							if (nodesMap[sourceKey] !== undefined && nodesMap[targetKey] !== undefined) {
								let sourceNode = nodes[nodesMap[sourceKey]];
								let targetNode = nodes[nodesMap[targetKey]];

								// Falls das Ziel noch keine originalIdea hat, übernehme es von der Quelle
								if (!targetNode.originalIdea) {
									targetNode.originalIdea = sourceNode.originalIdea;
								}

								// ob die Verbindung NUR durch "Keine ..." Knoten geht
								if (isEmptyTransition(sv) && isEmptyTransition(tv)) {
									return; //  Überspringen, also nicht in rawLinks einfügen
								}

								// Nur hinzufügen, wenn Node existiert
								if (nodesMap[sourceKey] !== undefined && nodesMap[targetKey] !== undefined) {
									rawLinks.push({
										source: nodesMap[sourceKey],
										target: nodesMap[targetKey],
										value: 1
									});
								}
							}
						}
					});
				});
			}
		});

		// Danach wie gehabt aggregieren
		let linksMap = {};
		rawLinks.forEach((link) => {
			const key = link.source + '->' + link.target;
			if (linksMap[key]) {
				linksMap[key].value += link.value;
			} else {
				linksMap[key] = { ...link };
			}
		});
		let links = Object.values(linksMap);
		sankeyData = { nodes, links };

		sankeyDataReadyToUse();
	});

	function createSankeyGenerator() {
		return sankey()
			.nodeWidth(nodeWidth) //horizontal space between nodes
			.nodePadding(nodePadding) //vertical space between nodes
			.extent([
				//overall layout boundaries
				[margin.left, margin.top],
				[svgWidth - margin.right, svgHeight - margin.bottom]
			]);
	}

	$: if (svgWidth && svgHeight && sankeyData.nodes.length > 0) {
		sankeyDataReadyToUse();
	}

	//Start with the viz setup

	const margin = { top: 10, right: 10, bottom: 5, left: 10 };
	const nodeWidth = svgWidth * 0.04; //urspr: 70/80
	const nodePadding = svgHeight * 0.002; //urspr.: 8/9

	//data muss durch den sankey generator, um positions zu kalkulieren (output wie sankeyData, nur mit Layout Daten )
	let sankeyDataReady;

	function sankeyDataReadyToUse() {
		if (sankeyData.nodes.length > 0) {
			const generator = createSankeyGenerator();
			sankeyDataReady = generator({
				nodes: sankeyData.nodes.map((d) => ({ ...d })),
				links: sankeyData.links.map((d) => ({ ...d }))
			});

			sankeyDataReady.links.forEach((link) => {
				link.width = link.value;
			});
		//Anzahl an Elementen pro stage ermitteln:
		const ohneProjektskizze = sankeyDataReady.links.filter(
			link => link.target.name === 'Keine Projektskizze'
				).reduce((sum, l) => sum + l.value, 0);

		// Anzahl Nodes in "Umsetzungsprojekt" (außer "Kein Umsetzungsprojekt", falls erwünscht)
		const umsetzungsprojektNodes = sankeyDataReady.nodes.filter(
			node => node.stage === 'Umsetzungsprojekt' && !node.name.toLowerCase().includes('kein umsetzungsprojekt')
		);

		//console.log('🚫 Ohne Projektskizze:', ohneProjektskizze);
		//console.log('🚀 Umsetzungsprojekte:', umsetzungsprojektNodes.length);
		
	
			
		}
	}

	function isEmptyTransition(nodeName) {
		const lower = nodeName.toLowerCase();
		return (
			lower.includes('keine projektskizze') ||
			lower.includes('keine maßnahme') ||
			lower.includes('kein umsetzungsprojekt')
		);
	}

	const linkGenerator = sankeyLinkHorizontal();



	// Steuerung für Nodes & Links
	let showIdeas = false;
	let showProjektskizzen = false;
	let showMaßnahmen = false;
	let showUmsetzungColor = false;

	let showLinksToProjektskizzen = false;
	let showLinksToMaßnahmen = false;
	let showLinksToUmsetzung = false;
	let showNoProjektskizzenLinks = false;

	let reduceOpacity = false;
	let increaseLinkWidth = false;


	
	let greyOutOthers = false;
	let showMaßnahmenLabel = false;
	let showUmsetzungLabel = false;
	let showProjektskizzenLabel= false;
	let showNodeLabel = false;
	let showUmsetzungsprojekte = false;

	
	let showGaertnerLabel = false;
	let showObstkarteLabel = false;
	let showVerleihplattformLabel = false;
	let showMeiEssnLabel = false;


	function startSankeyIdeas() {
		showIdeas = true;
		setTimeout(() => {
			signalNextStep();
		}, 2000);
	}


function startSankeyProjektskizzen() {
	showLinksToProjektskizzen = true;
	//showProjektskizzenLabel = true;

	requestAnimationFrame(() => {
		animateLinksDraw('Idee', 'Projektskizze');

	});

	setTimeout(() => {
		showProjektskizzen = true;
		signalNextStep();
		console.log('showProjektskizzen');
	}, 1000);
}



	function startSankeyMaßnahmen() {
		
		// showMaßnahmenLabel = true;
		showLinksToMaßnahmen = true;

		requestAnimationFrame(() => {
			animateLinksDraw('Projektskizze', 'Maßnahme');

		});

		setTimeout(() => {
			showMaßnahmen = true;
			showUmsetzungColor = true;
			showMaßnahmenLabel= true;


			signalNextStep();
		}, 1000);
	}

	function startSankeyUmsetzung() {
		showLinksToUmsetzung = true;

		requestAnimationFrame(() => {
			animateLinksDraw('Maßnahme', 'Umsetzungsprojekt');
		});


		setTimeout(() => {
			//showMaßnahmenLabel = false;
			showUmsetzungsprojekte = true;

			signalNextStep();
		}, 1000);
	}


	let phaseLock = false;
	function signalNextStep() {
		if (phaseLock) return; // Falls schon aktiv, nicht erneut starten
		phaseLock = true;
		console.log('phaseSankeyFromSTartIn der Funktion signal:', phaseSankey);

		setTimeout(() => {
			dispatch('phaseSankeyEnd');
			phaseLock = false; // Phase entsperren für nächsten Schritt
		}, 2000);
	}







	// Vorbereitung Beispiel // erste source == originalIdea
	const highlightExample = {
		//3 Ideen fließen in Hier & Jetzt ein
		0: {
			source: ' Eine Gärtnerstadt- und Gärtner App für Verbraucher und Touristen\n',
			target: 'Mei Essn/Regionale Lebensmittelplattform '
		},
		1: { source: 'Mei Essn/Regionale Lebensmittelplattform ', target: 'Bewegen' },
		2: { source: 'Bewegen', target: 'Hier & Jetzt' },

		3: {
			source: ' IDEE aus der Bürgerschaft: Digitale Obstkarte zum Ernten',
			target: 'Keine Projektskizze'
		},
		4: { source: 'Keine Projektskizze', target: 'Bewegen' },
		5: { source: 'Bewegen', target: 'Hier & Jetzt' },

		6: {
			source: 'Digitale Verleihplattform & Nachbarschaften verbinden',
			target: 'Raum (und Material-)lotse + Hier & Jetzt'
		},
		7: { source: 'Raum (und Material-)lotse + Hier & Jetzt', target: 'Teilhaben' },
		8: { source: 'Teilhaben', target: 'Hier & Jetzt' },

		//Andere Beispiele
		9: {
			source: 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen',
			target: 'Keine Projektskizze'
		}
	};

//Phasensteuerung
	$: if (phaseSankey === 1) {
		startSankeyIdeas();
	}

	$: if (phaseSankey === 2) {
		startSankeyProjektskizzen();
	}

	$: if (phaseSankey === 3) {
		showNoProjektskizzenLinks = true;
	}

	//TODO. Was soll das? 
	$: if (phaseSankey === 5) {
		increaseLinkWidth = true;
		reduceOpacity = true;
	}

let linksToHighlightGym =[];
	$: if (phaseSankey === 6) {
		//highlight link outdoorgymys
		linksToHighlightGym = [
		highlightExample[9]
		];
		animateLinksDraw(null, null, linksToHighlightGym);
		showNodeLabel = true;



		setTimeout(() => {
			signalNextStep();
		}, 6000);
	}


	$: if (phaseSankey === 7) {

		setTimeout(() => {
			resetLinkStyles(linksToHighlightGym);
			showNodeLabel = false;
			showNoProjektskizzenLinks = false;

			setTimeout(() => {
				startSankeyMaßnahmen();

			},4000);
			
		},2000);
		
	}


	
	$: if (phaseSankey === 10) {

		setTimeout(() => {
			showUmsetzungColor = false;
			showMaßnahmenLabel= false;

		startSankeyUmsetzung();


			
		},2000);

	}

	

	$: if (phaseSankey === 12) {
			showUmsetzungLabel = true;


		setTimeout(() => {
				signalNextStep();
		}, 2500);


	}




$: if (phaseSankey === 14) {
		//increaseLinkWidth = true;
		//reduceOpacity = true;
	const linksToHighlight = [
		highlightExample[0],
		highlightExample[3],
		highlightExample[6]
	];

	animateLinksDraw(null, null, linksToHighlight);


	setTimeout(() => {
		signalNextStep();
	}, 5000);

}



$: if (phaseSankey === 16) {

	const linksToHighlight = [
		highlightExample[1],
		highlightExample[4],
		highlightExample[7]
	];


		animateLinksDraw(null, null, linksToHighlight);

		//TODO MAßnahmenlabel anzeigen der genutzten aka Bewegen und Teilhaben
		//Oder via Farbe referenzieren: Bewegen: #e73e20; Teilhaben: #e73e20, 
		//kästchen in Farben und dann Text in Farbe!
		showUmsetzungColor = true;

			setTimeout(() => {
				signalNextStep();
			}, 3000);

	}

	$: if (phaseSankey === 17) {
		showUmsetzungLabel = true;

		const linksToHighlight = [
			highlightExample[2],
			highlightExample[5],
			highlightExample[8]
		];


		animateLinksDraw(null, null, linksToHighlight);

			setTimeout(() => {
				signalNextStep();
			}, 4000);

	}

	

	//Vorbereitung für Labels
	const stageYears = [
		{ stage: 'Idee', year: 2021, showPhase: 1 },
		{ stage: 'Projektskizze', year: 2022, showPhase: 3 },
		{ stage: 'Maßnahme', year: 2023, showPhase: 6 },
		{ stage: 'Umsetzungsprojekt', year: 2025, showPhase: 7 }
	];

	//Vorbereitung Stage Labels + BgBoxes
	const boxPaddingX = 10;
	const boxPaddingY = 15;
	$: boxWidth = svgWidth * 0.11;
	$: boxHeight = svgHeight * 0.12;

	
	export let sankeyAnnotations = [];

$: yearPositions = stageYears.map((d, i) => {
	const availableW = svgWidth - margin.left - margin.right;
	const step = availableW / (stageYears.length - 1);

	// Finde alle Nodes dieser Stage
	const nodesForStage = sankeyDataReady?.nodes?.filter(
		n => n.stage === d.stage && n.name !== 'Kein Umsetzungsprojekt'
	) || [];
	// Finde kleinstes y0 = höchste Position
	const minY = nodesForStage.length > 0
		? Math.min(...nodesForStage.map(n => n.y0))
		: margin.top;
	
	const yOffset = d.stage === 'Umsetzungsprojekt' ? -160 : -50;


	const xOffsets = {
		'Idee': +80,
		'Projektskizze': 0,
		'Maßnahme': 0,
		'Umsetzungsprojekt': +40
	}

	return {
		...d,
		x: margin.left + i * step + xOffsets[d.stage],
		y: minY + yOffset
	};
});

export let combinedAnnotations = [];
$: combinedAnnotations = yearPositions.map((pos) => {
  const match = sankeyAnnotations.find((a) => a.stage === pos.stage);
  return match ? { ...pos, text: match.text, showPhase: match.showPhase } : null;
}).filter(Boolean);






function animateLinksDraw(sourceStage, targetStage, specificLinks = []) {
	select('svg')
		.selectAll('path.link')
		.filter(function () {
			// Erst prüfen, ob ein konkretes Highlight vorliegt
			if (specificLinks.length > 0) {
				const source = this.getAttribute('data-source-name');
				const target = this.getAttribute('data-target-name');
				return specificLinks.some(
					(d) => d.source === source && d.target === target
				);
			}

			// Sonst nach Stage matchen
			return (
				this.getAttribute('data-source-stage') === sourceStage &&
				this.getAttribute('data-target-stage') === targetStage
			);
		})
		.each(function () {
			const path = select(this);
			const totalLength = this.getTotalLength();

			const source = this.getAttribute('data-source-name');
			const target = this.getAttribute('data-target-name');

			const isSpecific = specificLinks.some(
				(d) => d.source === source && d.target === target
			);

			// Animation für alle
			path
				.attr('stroke-dasharray', totalLength)
				.attr('stroke-dashoffset', totalLength);

			if (isSpecific) {
				// Nur für spezifische Links Style ändern
				path
					.attr('stroke', 'url(#smartCityGradient)')
					.attr('opacity', 1)
					.attr('stroke-width', 23);
			}

			path
				.raise()
				.transition()
				.duration(1000)
				.ease(easeCubicIn)
				.attr('stroke-dashoffset', 2);
		});
}


function resetLinkStyles(specificLinks = []) {
	select('svg')
		.selectAll('path.link')
		.filter(function () {
			const source = this.getAttribute('data-source-name');
			const target = this.getAttribute('data-target-name');
			return specificLinks.some(d => d.source === source && d.target === target);
		})
		.each(function () {
			select(this)
				.attr('stroke', 'white')
				.attr('opacity', 0.5)
				.attr('stroke-width', 10);
		});
}




/*/ $: if (sankeyDataReady) {
  const overview = sankeyDataReady.links.map((link, i) => ({
    idx: i,
    source: link.source.name,
    target: link.target.name,
    originalIdea: link.source.originalIdea,
    value: link.value,
    x0: link.source.x0,
    y0: link.source.y0,
    x1: link.target.x1,
    y1: link.target.y1,
  }));

  console.group("📦 sankeyDataReady.links");
  console.table(overview);
  console.groupEnd();

  // JSON export in Konsole
 // console.log("📤 Export JSON:");
//console.log(JSON.stringify(overview, null, 2));
}
*/

</script>

{#if sankeyDataReady}
	<g class="sankey-layer">
		<!-- <svg  viewBox="0 0 {width} {height}"preserveAspectRatio="xMinYMin meet">
   Links -->

		{#each sankeyDataReady.links as link (link.source.name + '-' + link.target.name)}
			{#if (link.source.stage === 'Idee' && link.target.stage === 'Projektskizze' && showLinksToProjektskizzen) || (link.source.stage === 'Projektskizze' && link.target.stage === 'Maßnahme' && showLinksToMaßnahmen) || (link.source.stage === 'Maßnahme' && link.target.stage === 'Umsetzungsprojekt' && showLinksToUmsetzung)}
				<path
					d={linkGenerator(link)}
					fill="none"
					data-source-stage={link.source.stage}
					data-target-stage={link.target.stage}
					data-source-name={link.source.name}
					data-target-name={link.target.name}
					stroke='white'
					stroke-width={Math.max(8, link.width + 8)}
					opacity= 0.7
					class="link"
				/>

			{/if}
		{/each}
		<!--opacity={link.target.name === 'Keine Projektskizze' && reduceOpacity ? 0.3 : 0.4}-->
		<!-- Nodes -->
		{#each sankeyDataReady.nodes as node (node.stage + '-' + node.name)}
			{#if (node.stage === 'Idee' && showIdeas) || 
			(node.stage === 'Projektskizze' && showProjektskizzen) || 
			(node.stage === 'Maßnahme' && showMaßnahmen) ||
			(node.stage === 'Umsetzungsprojekt' && showUmsetzungsprojekte)
			} 
				<g
					class="node"
					transform="translate({node.x0},{node.y0})"
					transition:fade={{ duration: 800 }}
				>
					<rect
						height={node.y1 - node.y0}
						width={node.x1 - node.x0}
						fill={node.stage === 'Maßnahme' && showUmsetzungColor
							? getColorForMeasure(node.name) || 'white'
							: '#dbc5c1'}


						rx="5"
						ry="5"
						class="node-rect"
					/>
				<!--	{#if node.stage !== 'Idee'}
						<text
							x={node.x0 < svgWidth / 2 ? node.x1 - node.x0 + 6 : -6}
							y={(node.y1 - node.y0) / 2}
							text-anchor={node.x0 < svgWidth / 2 ? 'start' : 'end'}
							class="fill-textcolor text-2xl md:text-4xl lg:text-4xl font-bold"
							transition:fade={{ duration: 500 }}
						>
							{node.name}
						</text>
					{/if}

			-->
           
				{#if 
					(node.stage === 'Maßnahme' && showMaßnahmenLabel) || 
					(node.name === 'Keine Projektskizze' && showNoProjektskizzenLinks) ||
					(node.name === 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen' && showNodeLabel) ||
					(node.name === 'Hier & Jetzt' && showUmsetzungLabel)||
					//erste stage
					(node.name === ' Eine Gärtnerstadt- und Gärtner App für Verbraucher und Touristen\n' && showGaertnerLabel)||
					(node.name === ' IDEE aus der Bürgerschaft: Digitale Obstkarte zum Ernten' && showObstkarteLabel)||
					(node.name === 'Digitale Verleihplattform & Nachbarschaften verbinden' && showVerleihplattformLabel)||
					//zweite stage
					(node.name === 'Mei Essn/Regionale Lebensmittelplattform ' && showMeiEssnLabel)||
					(node.name === ' Digitale Verleihplattform & Nachbarschaften verbinden' && showVerleihplattformLabel)
				}
					<text
						x={ 
							node.name === 'Hier & Jetzt'
								? node.x1 - node.x0 - 10
								:node.x1 - node.x0 + 10}
												
						y={
							node.name === 'Hier & Jetzt'
								? -30
								: (node.y1 - node.y0) / 2
						}
						text-anchor={node.name === 'Hier & Jetzt' ? 'end' : 'start'}

						class="fill-textcolor text-2xl md:text-4xl lg:text-6xl font-bold"
						transition:fade={{ duration: 800 }}
					>
						{#if node.name === 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen'}
							<tspan x={node.x1 + 650} dy="-1.2em">"Sportangebote im öffentlichen Raum II:</tspan>
							<tspan x={node.x1 + 650} dy="1.2em">Fitnessgeräte für Erwachsene</tspan>
							<tspan x={node.x1 + 650} dy="1.2em">auf Spielplätzen"</tspan>
			
						{:else}
							{node.name}
						{/if}
					</text>
				{/if}

				</g>
			{/if}
		{/each}
  

		<!--  Jahreszahlen pro Stage -->
		<!--{#each yearPositions as { year, stage, x, y, showPhase }}
			{#if phaseSankey >= showPhase}
				<text
					x={x}
					y={y - 40}
					font-size={svgWidth * 0.03}
					text-anchor="middle"
					class="years-label fill-textcolor"
					font-weight="bold"
				>
					{year}
				</text>

				<line
					x1={margin.left}
					x2={x}
					y1={margin.top - 20}
					y2={margin.top - 20}
					stroke="white"
					stroke-width="6"
					transition:draw={{ duration: 1100 }}
				/>

				<text
				x={x + margin.left}
				y={y + 100}
				text-anchor={
					stage === 'Idee' ? 'start' :
					stage === 'Umsetz-ungs-projekt' ? 'end' :
					'middle'
					}
				font-size={svgWidth * 0.03}
				fill="white"
				font-weight="bold"
				>
				{#each stage.split('-') as part, i}
					<tspan x={x} dy={i === 0 ? '0' : '1.2em'}>{part}</tspan>
				{/each}
				</text>


			{/if}
	{/each}
-->	
		<!--! Gradient -->
		<defs>
			<linearGradient id="smartCityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="#e73e20" />
				<stop offset="50%" stop-color="#883582" />
				<!-- smpurple -->
				<stop offset="100%" stop-color="#2b7ab7" />
				<!-- smblue -->
			</linearGradient>
		</defs>

		<!--</svg>-->
	</g>
{/if}



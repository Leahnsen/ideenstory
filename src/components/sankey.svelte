<script>
	// @ts-nocheck
	import { createEventDispatcher, onMount } from 'svelte';
	import { sankey, sankeyLinkHorizontal, sankeyCenter, sankeyLeft } from 'd3-sankey';
	import { scaleOrdinal, scaleLinear } from 'd3-scale';
	import { get } from 'svelte/store';
	import { writable } from 'svelte/store';
	import { transition } from 'd3-transition';
	import { select } from 'd3-selection';
	import { easeLinear, easeCubicIn } from 'd3-ease';
	import { draw, fade, slide } from 'svelte/transition';
	import { tick } from 'svelte';
	import EndAnimation from './EndAnimation.svelte';
	import {fly,blur} from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { base } from '$app/paths';
	import { bin, max } from 'd3-array';

	//import Annotations from './Annotations.svelte';

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
	const stages = ['Idee', 'Projektskizze', 'Umsetzungsprojekt'];

	export let sankeyNodeMap = {};
	let umsetzungIndex = new Map();


	$: if (sankeyDataReady) {
		sankeyNodeMap = {};
		sankeyDataReady.nodes.forEach((node) => {
			if (node.stage === 'Idee') {
				sankeyNodeMap[node.name] = { x: node.x0, y: node.y0 };
			}
		});
	}



$: if (sankeyDataReady) {
  const list = sankeyDataReady.nodes
    .filter(n => n.stage === 'Umsetzungsprojekt')
    .sort((a,b) => (a.y0 - b.y0) || (a.x0 - b.x0)); // vertikal sortieren, dann links/rechts

  // Name → Reihenindex
  umsetzungIndex = new Map(list.map((n,i) => [norm(n.name), i]));
  console.log('umsetzungIndex', umsetzungIndex);
}




	onMount(async () => {
		const svg = select(container);

		

		rawData = await fetch(`${base}/sankey.json`);
		rawData = await rawData.json();

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
				//else if (i === 1) value = record.maßnahme;
				else if (i === 1) value = record.umsetzungsprojekt;
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
			if ((stage === 'Umsetzungsprojekt' && val.includes(','))) {
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
				//{ stage: 'Maßnahme', value: record.maßnahme },
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
			.nodePadding(nodePadding) //vertical space between nodes#
			
			.nodeAlign(sankeyLeft)
			.extent([
				//overall layout boundaries
				[margin.left, margin.top],
				[svgWidth - margin.right, svgHeight - margin.bottom]
			])
			//.iterations(32);
	}

	let maxVal;
	let widthScale;

	$: if (svgWidth && svgHeight && sankeyData.nodes.length > 0) {
		sankeyDataReadyToUse();
			//Design & highlight links
			maxVal = max(sankeyDataReady.links, d => d.value);
			widthScale = scaleLinear([0, maxVal], [6, 55]);
	}

	//Start with the viz setup

	const margin = { top: 80, right: 500, bottom: 50, left: 150 };
	const nodeWidth = svgWidth * 0.025; //urspr: 70/80
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
	let showProjektskizzenLabel= false;
	let showNodeLabel = false;
	let showUmsetzungsprojekte = false;
	let showHierJetztLabel = false;

	
	let showGaertnerLabel = false;
	let showObstkarteLabel = false;
	let showVerleihplattformLabel = false;
	let showMeiEssnLabel = false;

	let showUmsetzungLabelOdd  = false; 
	let showUmsetzungLabelEven = false; 



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
	}, 1000);
}



	function startSankeyUmsetzung() {
		showLinksToUmsetzung = true;

		requestAnimationFrame(() => {
			animateLinksDraw('Projektskizze', 'Umsetzungsprojekt');
		});


		setTimeout(() => {
			showUmsetzungsprojekte= true;

			signalNextStep();
		}, 1000);
	}


	let phaseLock = false;
	function signalNextStep() {
		if (phaseLock) return; // Falls schon aktiv, nicht erneut starten
		phaseLock = true;
		//console.log('phaseSankeyFromSTartIn der Funktion signal:', phaseSankey);

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
		1: { source: 'Mei Essn/Regionale Lebensmittelplattform ', target: 'Hier & Jetzt' },

		2: {
			source: ' IDEE aus der Bürgerschaft: Digitale Obstkarte zum Ernten',
			target: 'keine Projektskizze, aber weiterverfolgt'
		},
		3: { source: 'keine Projektskizze, aber weiterverfolgt', target: 'Hier & Jetzt' },

		4: {
			source: 'Digitale Verleihplattform & Nachbarschaften verbinden',
			target: 'Raum (und Material-)lotse + Hier & Jetzt'
		},
		5: { source: 'Raum (und Material-)lotse + Hier & Jetzt', target: 'Hier & Jetzt' },

		//Andere Beispiele
		6: {
			source: 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen',
			target: 'Keine Projektskizze'
		}
	};
	
const PHASE7_LINKS = [
  { source: 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen', target: 'Keine Projektskizze' },
];
	
function resetLinksToDefault(list) {
  const ids = new Set(list.map(d => linkId(d.source, d.target)));
  select('svg').selectAll('path.link')
    .filter(function () {
      const id = linkId(this.getAttribute('data-source-name'), this.getAttribute('data-target-name'));
      return ids.has(id);
    })
    .each(function () {
      const v = this.__data__?.value;
      select(this)
        .attr('stroke', 'white')
        .attr('stroke-width', v != null ? widthScale(v) : 8)
        .attr('opacity', (this.getAttribute('data-target-name') === 'Keine Projektskizze' && reduceOpacity) ? 0.1 : 0.3);
    });
}
	function removeRects() {

		const svg = select('svg');

		svg
			.selectAll('.idee').remove();
			/*.transition()
			.duration(1400)
			.delay((d, i) => i * 2)
			.attr('opacity', 0);
		*/

	}

	let specificLinks = [];


//Phasensteuerung

$: if (phaseSankey === 1) {
		startSankeyIdeas();
	}
	
$: if (phaseSankey === 2) {
  addSpecificLinks([
    { source: 'Digitale Verleihplattform & Nachbarschaften verbinden',
      target: 'Raum (und Material-)lotse + Hier & Jetzt' }
  ], { revealTargetAfterDraw: true });

  showVerleihplattformLabel = true;

  setTimeout(signalNextStep, 3000);
}

$: if (phaseSankey === 3) {
  addSpecificLinks([
    { source: ' IDEE aus der Bürgerschaft: Digitale Obstkarte zum Ernten',
      target: 'Keine Projektskizze, aber weiterverfolgt' }
  ], { revealTargetAfterDraw: true });

  showObstkarteLabel = true;

  setTimeout(signalNextStep, 2500);
}


$: if (phaseSankey === 4) {
  addSpecificLinks([
    { source: ' Eine Gärtnerstadt- und Gärtner App für Verbraucher und Touristen\n',
      target: 'Mei Essn/Regionale Lebensmittelplattform ' },
	 { source: "App zu Abo-Kisten etc.",
		target: "Mei Essn/Regionale Lebensmittelplattform "}
  ], { revealTargetAfterDraw: true });

  showGaertnerLabel = true;
  setTimeout(signalNextStep, 2000);
}



	$: if (phaseSankey === 5) {
		startSankeyProjektskizzen();
		reduceOpacity = true;

 setTimeout(signalNextStep, 6000);


	}

	$: if (phaseSankey === 6) {
		showNoProjektskizzenLinks = true;
		showObstkarteLabel = false;
		showGaertnerLabel = false;
		showVerleihplattformLabel = false;
		 setTimeout(signalNextStep, 5000);


	}




$: if (phaseSankey === 7) {
	showNodeLabel = true;

  addSpecificLinks(PHASE7_LINKS, { revealTargetAfterDraw: true });
  setTimeout(signalNextStep, 2000);
}


$: if (phaseSankey === 9) {


setTimeout(() => {
				showNoProjektskizzenLinks = false;
				showNodeLabel = false;
				resetLinksToDefault(PHASE7_LINKS);

}, 2000)



	setTimeout(() => {
		signalNextStep();
	}, 5000);

}



$: if (phaseSankey === 10) {
		addSpecificLinks( [
			{ source: 'Keine Projektskizze, aber weiterverfolgt', target: 'Hier & Jetzt' },
			{ source: 'Mei Essn/Regionale Lebensmittelplattform ', target: 'Hier & Jetzt' }, 
			{ source: 'Raum (und Material-)lotse + Hier & Jetzt', target: 'Hier & Jetzt' }

		], { revealTargetAfterDraw: true });
	
		//showUmsetzungColor = true;


			setTimeout(() => {
				showHierJetztLabel = true;

				signalNextStep();
			}, 5000);

	}



	
	$: if (phaseSankey === 13) {

		setTimeout(() => {
		startSankeyUmsetzung();
		
		},2000);


	}

	

	$: if (phaseSankey === 14) {
		showUmsetzungLabelOdd = true;   
		

		setTimeout(() => {
				signalNextStep();
		}, 2500);


	}


	$: if (phaseSankey === 15) {
		showUmsetzungLabelOdd = false;
		showUmsetzungLabelEven = true;   
		
		setTimeout(() => {
				signalNextStep();
		}, 2500);
	}



	$: if (phaseSankey === 16) {
		removeRects(); 
			setTimeout(() => {
				signalNextStep();
			}, 4000);

	}

	

	//Vorbereitung für Labels
	const stageYears = [
		{ stage: 'Idee', year: 2021, showPhase: 1 },
		{ stage: 'Projektskizze', year: 2022, showPhase: 2 },
		//{ stage: 'Maßnahme', year: 2023, showPhase: 6 },
		{ stage: 'Umsetzungsprojekt', year: 2025, showPhase: 8}
	];

	//Vorbereitung Stage Labels + BgBoxes
	const boxPaddingX = 10;
	const boxPaddingY = 15;
	$: boxWidth = svgWidth * 0.11;
	$: boxHeight = svgHeight * 0.12;

	
	export let sankeyAnnotations = [];
	//console.log('sankeyAnnotations', sankeyAnnotations);
$: yearPositions = stageYears.map((d, i) => {
	const nodesForStage = sankeyDataReady?.nodes?.filter(
		n => n.stage === d.stage && n.name !== 'Kein Umsetzungsprojekt'
	) || [];

	const minY = nodesForStage.length > 0
		? Math.min(...nodesForStage.map(n => n.y0))
		: margin.top;

	const topNode = nodesForStage.find(n => n.y0 === minY);

	const yOffset = d.stage === 'Umsetzungsprojekt' ? -160 : 0;

	return {
		...d,
		x: topNode ? (topNode.x0 + topNode.x1) / 2 : margin.left + i * ((svgWidth - margin.left - margin.right) / (stageYears.length - 1)),
		y: minY + yOffset
	};
});


//console.log('yearPositions', yearPositions);
export let combinedAnnotations = [];
$: combinedAnnotations = yearPositions.map((pos) => {
  const match = sankeyAnnotations.find((a) => a.stage === pos.stage);
  return match ? { ...pos, text: match.text, showPhase: match.showPhase } : null;
}).filter(Boolean);




//console.log('combinedAnnotations', combinedAnnotations);



function animateLinksDraw(sourceStage, targetStage, specificList = [], opts = {}) {
  const { revealTargetAfterDraw = false, replayDashIfDrawn = false } = opts;
  const specificIds = new Set(specificList.map(d => linkId(d.source, d.target)));

  select('svg')
    .selectAll('path.link')
    .filter(function () {
      const s = this.getAttribute('data-source-name');
      const t = this.getAttribute('data-target-name');
      const id = linkId(s, t);

      if (specificIds.size) {
        // Bei spezifischen Links: IMMER mitnehmen – auch wenn schon gezeichnet
        return specificIds.has(id);
      }
      // Massenfall: bereits gezeichnete überspringen
      if (drawnLinkIds.has(id)) return false;

      return (
        this.getAttribute('data-source-stage') === sourceStage &&
        this.getAttribute('data-target-stage') === targetStage
      );
    })
    .each(function () {
      const path = select(this);
      const s = this.getAttribute('data-source-name');
      const t = this.getAttribute('data-target-name');
      const id = linkId(s, t);
      const isSpecific = specificList.length && specificIds.has(id);
      const alreadyDrawn = drawnLinkIds.has(id);

      // Bereits gezeichnet + spezifisch: nur highlighten & nach vorn holen
      if (isSpecific && alreadyDrawn && !replayDashIfDrawn) {
        path.attr('stroke', 'url(#smartCityGradient)').attr('stroke-width', 15).attr('opacity', 1).raise();
        if (revealTargetAfterDraw) forceNodes([t]);
        return;
      }

      // Normaler Draw
      const L = this.getTotalLength();
      path.attr('stroke-dasharray', L).attr('stroke-dashoffset', L);
      if (isSpecific) path.attr('stroke', 'url(#smartCityGradient)').attr('stroke-width', 15).attr('opacity', 1);

      path.raise()
        .transition().duration(1000).ease(easeCubicIn)
        .attr('stroke-dashoffset', 2)
        .on('end', () => {
          drawnLinkIds.add(id);
          path.classed('drawn', true);
          if (revealTargetAfterDraw) forceNodes([t]);
        });
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
				.attr('opacity', 0.3)
			//	  .attr('stroke-width', widthScale(this.value));
		});
}



let forceShowNodes = new Set(); //enthält spezifische Nodes, die einzeln sichtbar werden sollen
let drawnLinkIds = new Set();   // merkt bereits gezeichnete Links
let visibleSpecificIds= new Set(); // merkt bereits gezeichnete Links
const linkId = (s, t) => `${norm(s)}→${norm(t)}`;


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

// Anzahl aller einzigartigen Ideen
const ideeCount = new Set(rawData.map(d => d.idee)).size;

//get rid of space in names
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();


function isSpecific(link) {
  return specificLinks.some(d =>
    norm(d.source) === norm(link.source.name) &&
    norm(d.target) === norm(link.target.name)
  );
}


async function addSpecificLinks(list, { revealTargetAfterDraw = true } = {}) {
  // 1) sichtbar machen (kumulativ!)
  const next = new Set(visibleSpecificIds);
  list.forEach(d => next.add(linkId(d.source, d.target)));
  visibleSpecificIds = next; // Reassignment -> Template zeigt alle bisherigen + neuen

  await tick(); // warten, bis die <path>-Elemente für die NEUEN existieren

  // 2) nur die NEUEN animieren (die alten sind schon drawn)
  const justAdded = list.map(d => ({ source: norm(d.source), target: norm(d.target) }));
  requestAnimationFrame(() => {
    animateLinksDraw(null, null, justAdded, { revealTargetAfterDraw });
  });
}


// Hilfsfunktion 
function forceNodes(names) {
  const next = new Set(forceShowNodes);     // Kopie anlegen
  names.forEach(n => next.add(norm(n)));    // Targets normalisiert hinzufügen
  forceShowNodes = next;                    // <-- NEU ZUWEISEN => reaktiv!
}
async function drawSpecific(list) {
  // Normierte Whitelist speichern
  specificLinks = list.map(d => ({
    source: norm(d.source),
    target: norm(d.target)
  }));

  forceNodes(list.map(d => d.target));

  await tick();                 // <— warten, bis die <path>-Elemente gerendert sind
  requestAnimationFrame(() => { // nächster Frame: sicher da
    animateLinksDraw(null, null, specificLinks);
  });
}


$: fontsizeAnnotations =
  svgWidth < 600
	? 18
	: svgWidth < 900
	? 20
	: svgWidth < 1200
	? 30
	: svgWidth < 2000
	? 40
	: 30;


// Labels gezielt umbrechen (Key = normalisierter Node-Name)
const breakMap = new Map([
  ['Innovativer Katastrophenschutz', ['Innovativer', 'Katastrophenschutz']],
  ['Regionale Lebensmittelplattform', ['Regionale', 'Lebensmittelplattform']],
]);

</script>

{#if sankeyDataReady}
	<g class="sankey-layer">
		<!-- <svg  viewBox="0 0 {width} {height}"preserveAspectRatio="xMinYMin meet">
   Links -->

		{#each sankeyDataReady.links as link (link.source.name + '-' + link.target.name)}
				{#if
					(showLinksToProjektskizzen && link.source.stage === 'Idee' && link.target.stage === 'Projektskizze') ||
					(showLinksToUmsetzung     && link.source.stage === 'Projektskizze' && link.target.stage === 'Umsetzungsprojekt') ||
					(visibleSpecificIds.size && visibleSpecificIds.has(linkId(link.source.name, link.target.name)))
				}
				<path
					d={linkGenerator(link)}
					fill="none"
					data-source-stage={link.source.stage}
					data-target-stage={link.target.stage}
					data-source-name={norm(link.source.name)}
					data-target-name={norm(link.target.name)}
					stroke='white'
					stroke-width={widthScale(link.value)}
					opacity={ (link.target.name === 'Keine Projektskizze' && reduceOpacity ? 0.1 : 0.3)
					} 
					class="link"
				/>

			{/if}
		{/each}
		<!--opacity={link.target.name === 'Keine Projektskizze' && reduceOpacity ? 0.3 : 0.4}-->
		<!-- Nodes -->
		{#each sankeyDataReady.nodes as node (node.stage + '-' + node.name)}
			{#if
				(node.stage === 'Idee' && showIdeas) ||
				(node.stage === 'Projektskizze' && (showProjektskizzen || forceShowNodes.has(norm(node.name)))) ||
				(node.stage === 'Umsetzungsprojekt' && (showUmsetzungsprojekte || forceShowNodes.has(norm(node.name))))
			}
				<g
					class="node"
					transform="translate({node.x0},{node.y0})"
					transition:fade={{ duration: 800 }}
				>
					<rect
						height={node.y1 - node.y0}
						width={node.x1 - node.x0}
						fill={node.name === 'Hier & Jetzt' && showHierJetztLabel || node.name === 'Keine Projektskizze' && showNoProjektskizzenLinks
							? 'url(#smartCityGradient)'
							: '#dbc5c1'}

						stroke-width="10"
						opacity={node.name === 'Keine Projektskizze' && showNoProjektskizzenLinks ? 0.7: 1}
						rx="3"
						ry="3"
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
					{#if node.name === 'Keine Projektskizze' && showNoProjektskizzenLinks}
						<text
							x={node.x1 - node.x0 + 10}
							y={(node.y1 - node.y0) / 2}
							text-anchor="start"
							dominant-baseline="middle"
							font-size={fontsizeAnnotations}
							class="fill-textcolor font-bold"
							transition:fade={{ duration: 900 }}
						>
							Keine Skizze 
						</text>
					{/if}
           
				{#if 
					(node.name === 'Keine Projektskizze' && showNodeLabel) ||
					//(node.name === 'Sportangebote im öffentlichen Raum II: Fitnessgeräte für Erwachsene auf Spielplätzen' && showNodeLabel) ||
					(node.name === 'Hier & Jetzt' && showHierJetztLabel)||
					//erste stage
					(node.name === 'Keine Projektskizze, aber weiterverfolgt' && showGaertnerLabel)||
					(node.name === 'Mei Essn/Regionale Lebensmittelplattform ' && showObstkarteLabel)||
					(node.name === 'Raum (und Material-)lotse + Hier & Jetzt' && showVerleihplattformLabel)||
					(node.stage === 'Umsetzungsprojekt' && (
     					((showUmsetzungLabelOdd  && ((umsetzungIndex.get(norm(node.name)) ?? 0) % 2 === 0)) ||
      					(showUmsetzungLabelEven && ((umsetzungIndex.get(norm(node.name)) ?? 0) % 2 === 1)))
 					 ))

				}
					<!-- svelte-ignore missing-declaration -->
					<text
						x={ 
							node.name === 'Hier & Jetzt'
								? node.x1 - node.x0 +10
								:node.x1 - node.x0 + 10}
												
						y={
							node.name === 'Hier & Jetzt'
								? (node.y1 - node.y0) / 2
								: node.name === 'Keine Projektskizze' && showNodeLabel
								? (node.y1 - node.y0) / 2 + (node.y1 - node.y0) / 3
								: (node.y1 - node.y0) / 2
						}
						  text-anchor="start"
							dominant-baseline="middle"
							font-size={fontsizeAnnotations}  
							class="fill-textcolor font-bold"

 						 transition:fade={{ duration: 850, easing: quintOut }}

					>
						{#if node.name === 'Keine Projektskizze' && showNodeLabel}
							{`Fitnessgeräte im öffentlichen Raum`}
				
			
						{:else if (node.name === 'Keine Projektskizze, aber weiterverfolgt')}
								{`Gärtner App`}
						
						{:else if (node.name === 'Mei Essn/Regionale Lebensmittelplattform ')}
								{`Digitale Obstkarte zum Ernten, App zu Abo-Kisten`}

						{:else if (node.name === 'Raum (und Material-)lotse + Hier & Jetzt')}
								{`Digitale Verleihplattform`}
						
						{:else if (breakMap.has(norm(node.name)))}
							{#each breakMap.get(norm(node.name)) as line, i}
								<tspan
								x={node.x1 - node.x0 + 10}
								dy={i === 0 ? '-0.6em' : '1em'}
								>{line}</tspan>
							{/each}

						{:else}
							{node.name}
						{/if}
					</text>
				{/if}

				</g>
			{/if}
		{/each}
  


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



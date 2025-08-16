<script>
	// @ts-nocheck
	import { onMount, createEventDispatcher } from 'svelte';
	import { select, selectAll } from 'd3-selection';
	import { transition } from 'd3-transition';
	import { scaleOrdinal } from 'd3-scale';
	import {schemeSet3} from 'd3-scale-chromatic';
	import { xml } from 'd3-fetch';
	import Sankey from './sankey.svelte';
	import { max } from 'd3-array';
	import { easeBackOut, easeBounceInOut } from 'd3-ease';
	import { animate } from 'motion';
	import { lab } from 'd3';
	import { cubicInOut } from 'svelte/easing';

	export let allData = [];
	export let catCount = [];
	export let phase;
	export let farbSkala;
	export let container;
	export let svgWidth;
	export let svgHeight;
	let svg;

	let phaseLock = false;

	function signalNextStep() {
		if (phaseLock) return; // Falls schon aktiv, nicht erneut starten
		phaseLock = true;

		setTimeout(() => {
			dispatch('phaseEnd');
			phaseLock = false; // Phase entsperren für nächsten Schritt
		}, 2000);
	}

	const dispatch = createEventDispatcher(); // Event-Dispatcher, um das Story-Update zu triggern

	//Kategorien und Farben
	//Umwandlung der Kategorien in Set
	const katSammlung = new Set(allData.map((d) => d.kategorie));
	//D3 Funktionen erwarten aber Array mit Index als Eingabe   [...katSammlung]... ist Spread Operator und wandelt um in Array
	//Alternativ: const katSammlungArray = Array.from(katSammlung);
	const katSammlungArray = [...katSammlung];

	// Layout für Ideengeber-Rects
	const rectSize = svgWidth * 0.1; // 1% der Breite
	const gap = svgWidth * 0.015;
	const columns = 6;
	
	//const columns = Math.floor(svgWidth / (rectSize + gap));

	// **Eindeutige Liste der Ideengeber erstellen**
	let eindeutigeIdeengeber = Array.from(new Set(allData.map((d) => d.ideengeber))).map(
		(ideengeber) => ({
			ideengeber,
			ideen_count: allData.filter((d) => d.ideengeber === ideengeber).length // Anzahl der Ideen pro Ideengeber zählen
		})
	);

	//Durchnschnittliche Ideen pro Ideengeber
	let averageIdeen = 0;
	eindeutigeIdeengeber.forEach((ideengeber) => {
		averageIdeen += ideengeber.ideen_count;
	});
	averageIdeen = (averageIdeen / eindeutigeIdeengeber.length).toFixed(1);

	//Positionen für Ideengeber speichern
	let positionen = {};
	eindeutigeIdeengeber.forEach((d, i) => {
		const col = i % columns;
		const row = Math.floor(i / columns);
		positionen[d.ideengeber] = {
			x: col * (rectSize + gap) + gap,
			y: row * (rectSize + gap) + gap
		};
	});

	// Alle Ideen mit korrektem Index für das Grid speichern
	let alleIdeen = [];
	eindeutigeIdeengeber.forEach((ideengeber) => {
		let ideenListe = allData.filter((d) => d.ideengeber === ideengeber.ideengeber);
		ideenListe.forEach((idee, index) => {
			alleIdeen.push({
				idee: idee.idee,
				id: idee.id,
				ideengeber: idee.ideengeber,
				kategorie: idee.kategorie,
				index // Index für jede Idee innerhalb des Ideengebers, bspw. 0-5 (Grid Berechnung der Animation beruht)
			});
		});
	});



	//SVG initialisieren und statische Elemente zeichnen
	onMount(() => {
		svg = select(container)
			.attr('viewBox', container.getAttribute('viewBox'))
			.attr('preserveAspectRatio', 'xMinYMin meet'); //gleichmäsige Skalierung bei unterschiedlichen Seitenverhältnissen

		//Vorbereitung für die Rects: Gradients für Farbverlauf definieren
		const defs = svg.append('defs');

		const gradient = defs
			.append('linearGradient')
			.attr('id', 'ideeGradient')
			.attr('x1', '0%')
			.attr('x2', '100%')
			.attr('y1', '0%')
			.attr('y2', '100%');

		//Farbverlauf definieren
		gradient.append('stop').attr('offset', '0%').attr('stop-color', '#e73e20');

		gradient.append('stop').attr('offset', '50%').attr('stop-color', '#883582');

		gradient.append('stop').attr('offset', '100%').attr('stop-color', '#2b7ab7');

	
	});


	function randomStartPosition() {
		const side = Math.floor(Math.random() * 3);

		switch (side) {
			case 0:
				return { x: Math.random() * svgWidth, y: svgHeight *30 }; 
			case 1:
				return { x: svgWidth + 150, y: Math.random() * svgHeight }; 
			case 2:
				return { x: Math.random() * svgWidth, y: svgHeight *3 }; 
			case 3:
				return { x: -150, y: Math.random() * svgHeight }; 
		}
	}
	

	function drawIdeas() {
	//svg.selectAll('.idee').remove();
		const padding = rectSize * 0.3;
		const rows = Math.floor(svgHeight / padding);
		const columns = Math.ceil(alleIdeen.length / rows);
		const totalWidth = columns * padding;
		const startX = svgWidth - totalWidth;

	svg.selectAll('.idee')
	.data(alleIdeen)
	.join('rect')
	.attr('class', 'idee')
	.attr('opacity', 1)

     .each(function() {
        // EINMAL pro neuem Element:
        const { x, y } = randomStartPosition();
        select(this)
          .attr('x', x)
          .attr('y', y)
          .attr('fill','url(#ideeGradient)')
          .attr('width', rectSize*0.15)
          .attr('height', rectSize*0.15)
          .attr('rx', rectSize*0.02);
      })
    .transition()
      .delay((d,i)=>i*10)
      .duration(2500)
      .ease(easeBackOut.overshoot(1.7))
	  .attr('x', (d, i) => Math.floor(i / rows) * padding + startX)
	  .attr('y', (d, i) => (i % rows) * padding);


		const annotationIdeas = svg
			.selectAll('.annotation-idee')
			.data([null]) // Dummy-Datenbindung, sonst funkt join noicht
			.join('text')
			.attr('class', 'annotation-idee')
			.attr('x', startX + padding)
			.attr('y', padding * 15)
			.attr('transform', `rotate(-90, ${startX - padding}, ${padding * 15})`)
			.attr('text-anchor', 'middle')
			.text(`263 Ideen`)
			.attr('font-size', svgWidth * 0.05)
			.attr('font-weight', 'bold')
			.attr('fill', 'white')
			.attr('font-family', 'Inter, sans-serif')
			.attr('opacity', 0);

		annotationIdeas
			.transition()
			.duration(2000)
			.attr('opacity', 1)
			//.on('end', signalNextStep());
	}

	// debugging
	// ideenRects.on("mouseover", (event, d) => {
	 //  console.log(`Idee: ${d.idee} | Ideengeber: ${d.ideengeber} | Kategorie: ${d.kategorie}`);
	//});



function highlightIdea(zielIdee, restoreFill = 'url(#ideeGradient)') {
    const ziel = alleIdeen.find(d => d.id === zielIdee);
    if (!ziel) return console.warn("Idee nicht gefunden:", zielIdee);

    const rect = svg.selectAll('.idee').filter(d => d === ziel);
    if (rect.empty()) return console.warn("SVG-Element nicht gefunden:", zielIdee);

    rect
      .transition().duration(200).attr('stroke-width', 20)
      .transition().duration(2000).attr('stroke', 'white').attr('fill', 'white')
      .transition().delay(2000).duration(1000)
      .attr('stroke-width', 0).attr('stroke', 'none').attr('fill', restoreFill);
  }







	function drawIdeengeber() {
		setTimeout(() => {
			svg.select('.annotation-idee')
				.transition()
				.duration(2000)
				.attr('opacity', 0);

			// Ideengeber zeichnen
			svg
				.selectAll('.ideengeber')
				.data(eindeutigeIdeengeber)
				.join('rect')
				.attr('class', 'ideengeber')
				.attr('fill', 'grey')
				.attr('width', rectSize)
				.attr('height', rectSize)
				.attr('x', (d) => positionen[d.ideengeber].x)
				.attr('y', (d) => positionen[d.ideengeber].y)
				.attr('rx', rectSize * 0.1)
				.attr('opacity', 0)
				.on('mouseover', (event, d) => {
					console.log(`Ideengeber: ${d.ideengeber}`)});

			setTimeout(() => {
				document.querySelectorAll('rect.ideengeber').forEach((el, i) => {
					animate(
						el,
						{
							opacity: [0, 1],
							scale: [0.4, 1]
						},
						{
							delay: i * 0.01, // kleine Verzögerung je Element
							duration: 0.5,
							easing: 'back-out'
						}
					);
				});
			}, 10); // mini Timeout, damit D3 erst DOM schreibt



	const annotationIdeengeber = svg
		.selectAll('.annotation-ideengeber')
		.data([null])
		.join('text')
		.attr('class', 'annotation-ideengeber')
		.attr('x', (columns * rectSize + gap) / 2)
		.attr('y', gap / 2)
		.attr('text-anchor', 'middle')
		.text('') // Start leer, weil kommt über Animation 
		.attr('font-size', svgWidth * 0.05)
		.attr('font-weight', 'bold')
		.attr('fill', 'white')
		.attr('font-family', 'Inter, sans-serif')
		.attr('opacity', 0);

	// Element-Referenz holen
	const node = annotationIdeengeber.node();

	// Sichtbarkeit per D3-Transition (wie bisher)
	annotationIdeengeber
		.transition()
		.duration(500)
		.attr('opacity', 1);

	// Zähler animieren mit motion
	animate(0, eindeutigeIdeengeber.length, {
		duration: 2,
		easing: 'ease-out',
		onUpdate: (v) => {
			node.textContent = `${Math.round(v)} Ideengeber:innen`;
		},
	}).finished.then(() =>{
		ideenToIdeengeber();
		setTimeout(() => {
		signalNextStep();
			
		}, 2500);
		
	
	}) 

	}, 1000);
}

	// Ideen fliegen zu ihren Ideengebern & ordnen sich als Grid an
	async function ideenToIdeengeber() {
		// Anzahl Ideen pro Ideengeber berechnen
		const ideenProGeber = {};
		alleIdeen.forEach((d) => {
			if (!ideenProGeber[d.ideengeber]) ideenProGeber[d.ideengeber] = [];
			ideenProGeber[d.ideengeber].push(d);
		});

		// index innerhalb des jeweiligen Ideengebers merken
		Object.values(ideenProGeber).forEach((gruppe) => {
			gruppe.forEach((d, i) => (d.innerIndex = i));
		});

		let ideenRects = svg.selectAll('.idee').raise();
		ideenRects
			.transition()
			.duration(2000)
			.delay(1000)
			.attr('x', (d) => {
				const baseX = positionen[d.ideengeber].x;
				const ideen = ideenProGeber[d.ideengeber];
				const spalten = Math.ceil(Math.sqrt(ideen.length)); // Quadratgrid
				const col = d.innerIndex % spalten;
				return baseX + col * rectSize * 0.15;
			})
			.attr('y', (d) => {
				const baseY = positionen[d.ideengeber].y;
				const ideen = ideenProGeber[d.ideengeber];
				const spalten = Math.ceil(Math.sqrt(ideen.length));
				const row = Math.floor(d.innerIndex / spalten);
				return baseY + row * rectSize * 0.15;
			})
			.end();
	}



	function highlightAverageIdeas() {
		let transitions = [];


		svg.selectAll('rect.ideengeber').each(function (d) {
			const rect = select(this);


			if (d.ideen_count === 3 || d.ideen_count === 4) {
				const t = rect
					.transition()
					//.duration(200)
					//.attr('stroke-width', 7)
					//.transition()
					.duration(2000)
					.attr('fill', 'white')
					.attr('opacity', 0.8)
					//.attr('stroke', 'white')
					.transition()
					.delay(2000)
					.duration(900)
					.attr('fill', 'grey')
					.attr('opacity', 1)
					//.attr('stroke-width', 0)
					//.attr('stroke', 'none')
					.end();

				transitions.push(t);
			} else {
				const t = rect
					.transition()
					.duration(2000)
					.attr('opacity', 0.8)
					.transition()
					.delay(2000)
					.duration(900)
					.attr('opacity', 1)
					.end();

				transitions.push(t);
			}
		});

		Promise.all(transitions).then(() => {
			setTimeout(() => {
				signalNextStep();
			},1500);
		});
	}


	/*/*function highlightMaxIdeas() {
		const transitions = [];
		svg.selectAll('rect.ideengeber').each(function (d) {
			console.log(d.ideengeber, d.ideen_count);
			const rect = select(this);
			const originalYPosition = positionen[d.ideengeber].y;
			const originalXPosition = positionen[d.ideengeber].x;

			if (d.ideen_count === 39) {
				//Bounce nach Oben und rechts für Highlight
				const t = rect
					.transition()
					.duration(200)
					.attr('stroke-width', 7)
					.transition()
					.duration(2000)
					.attr('stroke', 'white')
					.transition()
					.delay(2000)
					.duration(2000)
					.attr('stroke-width', 0)
					.attr('stroke', 'none')
					.end();
				transitions.push(t);
			} else {
				const t = rect
					.transition()
					.duration(2000)
					.attr('opacity', 0.3)
					.transition()
					.delay(2000)
					.duration(2000)
					.attr('opacity', 1)
					.end();

				transitions.push(t);
			}
		});

		Promise.all(transitions).then(() => {
			signalNextStep();
		});
	}
	*/



	function colorIdeas() {
		svg.selectAll('rect.idee').each(function (d, i) {
			const zielFarbe = farbSkala(d.kategorie);

			animate(
				this,
				{
					fill: zielFarbe,
					opacity: [0.5, 0.75, 1]
				},
				{
					//delay: i * 0.01,
					duration: 1.2,
					ease: 'circInOut'
				}
			);
		});

		//setTimeout(signalNextStep, alleIdeen.length * 10 + 1400);
	}

	function ideasToBarChart() {
		fadeOutIdeengeberRects();
		//Ideengeber:innen Ü weg
		svg
			.select('.annotation-ideengeber')
			.transition()
			.duration(2000)
			//.ease(easeBackOut.overshoot(1.7))
			.attr('opacity', 0);

		let ideenRects = svg.selectAll('.idee');
		ideenRects
			.transition()
			.duration(2000)
			//.delay(1000)  // Kürzere Wartezeit
			.attr('x', (d) => {
				let barX = barChartX; // Startposition der Balken
				let barIndex = catCount.findIndex((c) => c.kategorie === d.kategorie);
				let barWidth = (catCount[barIndex]?.count || 1) * 10; // Balkenbreite anhand der Häufigkeit
				let col = d.index % 6;
				return barX + col * (barWidth / 8); // Ideen gleichmäßig verteilen
			})
			.attr('y', (d) => {
				let barBaseY =
					barChartY +
					catCount.findIndex((c) => c.kategorie === d.kategorie) * (barHeight + barSpacing);
				let row = Math.floor(d.index / 8);
				return barBaseY + row * 12; // Innerhalb des Balkens in Reihen anordnen
			})

			.end()
			.then(() => {
				//console.log(`Idee ${d.idee} wurde in Bar für ${d.kategorie} geparkt.`);
				renderBarChartOrganic();

				setTimeout(() => {
					signalNextStep();
				}, 4000);
			});
	}

	function fadeOutIdeengeberRects() {
		svg.selectAll('.ideengeber').transition().duration(2000).attr('opacity', 0).remove();
	}

	//Bar Chart Vorbereitung

	const barChartX = svgWidth * 0.1; // vorher: 280
	const barChartY = svgHeight * 0.15; // vorher: 350
	const barHeight = svgHeight * 0.03;
	const barSpacing = svgHeight * 0.04; // etwas größer für Abstand
	const hSpacing = svgWidth * 0.025; // vorher: 47
	const vSpacing = svgWidth * 0.025; // vorher: 47
	const rectSizeBar = svgWidth * 0.02; // Rechteckgröße
	const labelOffset = barChartX * 0.2;
	//console.log('labelOffset:', labelOffset);
	//console.log("x", barChartX - labelOffset)
	//Für die Linien
	const barChartHeight = catCount.length * (barHeight + barSpacing);
	const lineX = barChartX - labelOffset * 2.5;
	const lineYTop = barChartY - barSpacing * 0.8; //Problem, kleiner?
	const lineYBottom = barChartY + barChartHeight - barSpacing;

	// Sortiere Kategorien nach Größe für Bar Chart
	catCount.sort((a, b) => b.count - a.count);
	let categoryPositions = {};
	catCount.forEach((d, i) => {
		categoryPositions[d.kategorie] = barChartX + i * barSpacing;
	});

	function renderBarChartOrganic() {
		// Gruppiert Rects nach Kategorie.
		const categories = Array.from(new Set(allData.map((d) => d.kategorie)));

		categories.forEach((cat) => {
			const rects = svg.selectAll('.idee').filter((d) => d.kategorie === cat);
			const numRects = rects.size();
			if (numRects === 0) return;

			const numCols = Math.ceil(numRects / 2); //Fix: 2 Zeilen, darauf aufbauend berechnen, wie viele Spalten

			const catIndex = catCount.findIndex((d) => d.kategorie === cat); //index der Kategorie

			//transtition start für die kleinen ideen rects
			// Die x-Position berechnet sich aus der Spaltenposition, die y-Position aus dem Startwert plus
			// dem Offset der Kategorie plus der Zeilenverschiebung (0 oder 1)
			rects
				.transition()
				.duration(1500)
				.delay((d, i) => i * 30) //gestaffelter delay => Endruck von organischem zusammenfließen
				.attr('x', (d, i) => barChartX + (i % numCols) * hSpacing)
				.attr(
					'y',
					(d, i) =>
						barChartY + catIndex * (barHeight + barSpacing) + Math.floor(i / numCols) * vSpacing
				)
				.attr('width', rectSizeBar)
				.attr('height', rectSizeBar)
				.attr('fill', (d) => farbSkala(d.kategorie));
		});

		const labels = svg
			.selectAll('.bar-label')
			.data(catCount)
			.join('text')
			.attr('class', 'bar-label')
			.attr('x', barChartX - labelOffset)
			.attr('y', (d, i) => barChartY + i * (barHeight + barSpacing) - 7)
			.attr('font-size', svgWidth * 0.027)
			.attr('fill', 'white')
			.attr('font-family', 'Inter, sans-serif')
			.text((d) => d.kategorie)
			.attr('opacity', 0);

		//Text, der die Anzahl der Ideen anzeigt – platziert am rechten Rand der Bar.
		const counts = svg
			.selectAll('.bar-count')
			.data(catCount)
			.join('text')
			.attr('class', 'bar-count')
			.attr('x', (d) => {
				// Berechne, wie viele Spalten diese Kategorie braucht:
				const numCols = Math.ceil(d.count / 2);
				return barChartX + numCols * hSpacing + 7;
			})
			.attr('y', (d, i) => barChartY + i * (barHeight + barSpacing) + rectSizeBar + vSpacing)
			.attr('alignment-baseline', 'center')
			.attr('font-size', svgWidth * 0.06)
			.attr('font-weight', 'bold')
			.attr('fill', 'white')
			.attr('opacity', 0)
			.text((d) => d.count);

		//Bar Chart Überschrift

		const annotationBarChart = svg
			.selectAll('.annotation-barChart')
			.data([null]) // Dummy-Datenbindung, sonst funkt join noicht
			.join('text')
			.attr('class', 'annotation-barChart')
			.attr('x', barChartX - labelOffset)
			.attr('y', barChartY - barSpacing)
			//.attr("transform", `rotate(-90, ${startX - padding}, ${padding * 15 })`)
			//.attr("text-anchor", "middle")
			.text(`Ideen in Kategorien gepackt `) //${catCount.length}
			.attr('font-size', svgWidth * 0.05)
			.attr('font-weight', 'bold')
			.attr('fill', 'white')
			.attr('font-family', 'Inter, sans-serif')
			.attr('opacity', 0);

		annotationBarChart.transition().duration(2000).attr('opacity', 1);

		//Einfliegen von Labels
		const barDelay = categories.length * 30 + 1800;

		labels
			.transition()
			.duration(600)
			.delay((d, i) => barDelay + i * 100)
			.attr('opacity', 1);

		counts
			.transition()
			.duration(500)
			.delay(barDelay + 100 + 200)
			.attr('opacity', 1);

		//Linien um die Bar Chart
		const lineLengthHorizontal = svgWidth * 0.92 - lineX;
		svg
			.selectAll('.bar-line-top')
			.data([null])
			.join('line')
			.attr('class', 'bar-line-top')
			.attr('x1', lineX)
			.attr('y1', lineYTop)
			.attr('x2', svgWidth * 0.92) // bis fast ganz rechts
			.attr('y2', lineYTop)
			.attr('stroke', 'white')
			.attr('stroke-width', 8)
			.attr('stroke-dasharray', lineLengthHorizontal)
			.attr('stroke-dashoffset', lineLengthHorizontal)
			.transition()
			.duration(1000)
			.ease(cubicInOut)
			.attr('stroke-dashoffset', 0);

		const lineLengthVert = lineYBottom - lineYTop;

		svg
			.selectAll('.bar-line-left')
			.data([null])
			.join('line')
			.attr('class', 'bar-line-left')
			.attr('x1', lineX)
			.attr('y1', lineYTop)
			.attr('x2', lineX)
			.attr('y2', lineYBottom)
			.attr('stroke', 'white')
			.attr('stroke-width', 8)
			.attr('stroke-dasharray', lineLengthVert)
			.attr('stroke-dashoffset', lineLengthVert)
			.transition()
			.duration(1000)
			.delay(200)
			.ease(cubicInOut)
			.attr('stroke-dashoffset', 0);
	}

	//Array Positionen rects vertikal zuordnen

	function hideBarChart() {
		svg
			.selectAll('.bar-label, .bar-count, .bar-line-top, .bar-line-left, .annotation-barChart')
			.transition()
			.duration(2000)
			.attr('opacity', 0)
			.remove();

		arrangeRectsVerticallyLeft();

		//setTimeout(() => {
		//	signalNextStep();
//}, 4000);
	}

	function arrangeRectsVerticallyLeft() {
		const total = svg.selectAll('.idee').size();
		const paddingLeft = 200;
		const padding = 20;
		const availableHeight = svgHeight - padding * 4;
		const rectSize = 9;
		//vertikeler Abstand zwischen Rects, damit alle reinpassen
		const vSpacing = (availableHeight - rectSize * total) / (total - 1);

		svg
			.selectAll('.idee')
			.transition()
			.duration(1000)
			.delay((d, i) => i * 15)
			.attr('x', paddingLeft)
			.attr('y', (d, i) => padding + i * (rectSize + vSpacing))
			.attr('width', rectSize)
			.attr('height', rectSize)

			.transition()
			.delay(500)
			.duration(250)
			.attr('fill', '#dbc5c1');
	}




$: if (phase === 1) {
	drawIdeas();

		setTimeout(() => {
			signalNextStep();
		},2000);
		
	}	

$: if (phase === 3) {
    highlightIdea(164);
    setTimeout(() => signalNextStep(), 4000);
  }
	
  // Highlight für Phase 5
  $: if (phase === 4) {
	highlightIdea(198);
    setTimeout(() => signalNextStep(), 3500);
  }

  // Highlight für Phase 6
  $: if (phase === 5) {
     highlightIdea(268);

    setTimeout(() => signalNextStep(), 3500);
  }


	$: if (phase === 6) {
		drawIdeengeber(); //Ideengeber tauchen auf
	}


	$: if (phase === 8) {
		//setTimeout(() => {
			highlightAverageIdeas(); // Hightlight average nr. of ideas
		//}, 3500);
	}

	/*$: if (phase === 11) {
		highlightMaxIdeas(); // 38 Ideen hervorheben
	}
	*/

	$: if (phase === 9) {
		setTimeout(() => {
			colorIdeas(); // Ideen werden eingefärbt
		setTimeout(signalNextStep, 3500);
		},1000);
	}

	$: if (phase === 12) {
		ideasToBarChart(); // Ideen fliegen in ihre Kategorie-Bar
	}

	$: if (phase === 14) {
		highlightIdea(164, '#8dd3c7');
		setTimeout(signalNextStep, 3500); 
		}


	$: if (phase === 15) {
		hideBarChart(); 
		setTimeout(signalNextStep, 3500); 

	}

	
	
</script>

<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { animate } from 'motion';
  import { easeLinear, easeCubicIn, easeBackOut } from 'd3-ease';
  import { transition } from 'd3-transition';
  import {createEventDispatcher} from 'svelte';


  /** Props von DataStory.svelte */
  export let ideenSet;
  export let sketchSet;
  export let projectSet;
  export let container; // das SVG-Element, das du via container={svgContainer} übergibst
  export let svgWidth;
  export let svgHeight;

  const dispatch = createEventDispatcher();

  // Array mit Zielwerten
  const counters = [
    { label: 'Ideen',              target: ideenSet.size },
    { label: 'Projektskizzen',     target: sketchSet.size },
    { label: 'Umsetzungsprojekte', target: projectSet.size }
  ];

	function randomStartPosition() {
		const side = Math.floor(Math.random() * 4);

		switch (side) {
			case 0:
				return { x: Math.random() * svgWidth, y: -150 }; // oben
			case 1:
				return { x: svgWidth + 150, y: Math.random() * svgHeight }; // rechts
			case 2:
				return { x: Math.random() * svgWidth, y: svgHeight + 150 }; // unten
			case 3:
				return { x: -150, y: Math.random() * svgHeight }; // links
		}
	}

  onMount(() => {
    const svg = select(container);

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

    // SVG-ViewBox auslesen, um mittig zu platzieren
    const vb = container.viewBox.baseVal;
    const startX = vb.width / 7;
    const startY  = vb.height / 2 - 50;
    const lineH   = 250;

    counters.forEach((c, i) => {
      // 1) SVG-Text anlegen, initial bei 0 und opacity=0
     const  text = svg.append('text')
        .attr('class', 'end-counter')
        .attr('x', startX)
        .attr('y', vb.height / 3 + i * lineH)
        .attr('font-weight', 'bold')
		    .attr('fill', 'white')
        .attr('text-anchor', 'start')
		    .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', `${Math.round(vb.width * 0.07)}px`)
        .attr('opacity', 0)
        .text(`0 ${c.label}`);


      // 2) Fade-in + Zähler-Animation
      text.transition()
        .delay(i * 1500)
        .duration(700)
        .attr('opacity', 1)
        .on('end', () => {
          animate(0, c.target, {
            duration: 2,
            easing: 'cubic-out',
            onUpdate(v) {
              text.text(`${Math.round(v)} ${c.label}`);
            }
          });
        });


    });
  


      const totalCounterTime = counters.length*400
    setTimeout(() => {
        const n         = ideenSet.size;
        const data      = Array.from({ length: n }, (_, i) => i);
        const centerY   = svgHeight * 0.6;
        const margin    = svgWidth * 0.1 + svgWidth * 0.1;
        const spacingX = (svgWidth - 2*margin) / (n - 1);  
        const amplitude = svgHeight * 0.3;
        const rectSize  = Math.min(svgHeight, svgWidth) * 0.02;


    

    // Ellipsen-Parameter
    const cx = svgWidth / 2;              // Mitte horizontal
    const cy = svgHeight * 0.45;          // knapp unter deinem Zähler-Text
    const rx = svgWidth * 0.5;            // Halbachse X
    const ry = svgHeight * 0.3;           // Halbachse Y
    const halfSize = rectSize / 2;

    // Winkel für eine halbe U-Form von links (π) nach rechts (2π)
    const angles = data.map((_,i) => Math.PI + (i/(n-1)) * Math.PI);
    const jitter = data.map(() => ({
      // kompletter Kreis um den Text – oder 1,5π für nur oben/unten
      angle: Math.random() * 2 * Math.PI,
      // Radien zwischen 80% und 120% des Originals
      rxF: 0.8 + Math.random() * 0.4,
      ryF: 0.8 + Math.random() * 0.4
    }));

    // Zufallsfaktor
    const rects = svg.selectAll('rect.fly')
    .data(data)
    .join('rect')
    .attr('class','fly')
    .attr('width',  rectSize)
    .attr('height', rectSize)
    .attr('rx',     rectSize*0.2)
    .attr('fill',   'url(#ideeGradient)')
    .attr('opacity',0)
    .attr('x', () => randomStartPosition(svgWidth, svgHeight).x)
    .attr('y', () => randomStartPosition(svgWidth, svgHeight).y);
// Einfliegen in die Ellipse
rects.transition()
  .delay((_, i) => i * 15)
  .duration(200)
  .attr('opacity', 0.8)
  .transition()
  .duration(2000)
  .ease(easeBackOut)
  .attr('x', (d, i) => {
    const { angle, rxF } = jitter[i];
    return cx + Math.cos(angle) * rx * rxF - halfSize;
  })
  .attr('y', (d, i) => {
    const { angle, ryF } = jitter[i];
    return cy + Math.sin(angle) * ry * ryF - halfSize;
  })
  .on('end', (d, i) => {
    if (i === n - 1) {
      // dann erst die Exit-Transition aller Rects starten
      rects.transition()
        .delay(500)
        .duration(1500)
        .attr('opacity', 0)
        .attr('x', () => randomStartPosition(svgWidth, svgHeight).x)
        .attr('y', () => randomStartPosition(svgWidth, svgHeight).y)
        .on('end', () => {
          // erst hier alle Texte ausblenden und entfernen
          svg.selectAll('text.end-counter')
            .transition()
            .duration(100)
            .attr('opacity', 0)
            .remove();

          // und die Rects
          svg.selectAll('rect.fly').remove();

          // jetzt das finished-Event dispatchen
          dispatch('finished');
        });
    }
  });
        }, totalCounterTime);
  });

</script>


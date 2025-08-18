<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { animate } from 'motion';
  import { easeLinear, easeCubicIn, easeBackOut } from 'd3-ease';
  import { transition } from 'd3-transition';
  import {createEventDispatcher} from 'svelte';


  /** Props von DataStory.svelte */
  //export let umsetzungIndex;
  export let ideenSet;
  const skizzen = 27;
  const umsetzungsprojekte = 15;
  export let container; 
  export let svgWidth;
  export let svgHeight;

  const dispatch = createEventDispatcher();

    const D = {
    rectAppearDelayStep: 15,     // Staffelung beim Einflug der Rects
    rectAppearFade: 200,         // Dauer bis opacity 0.8
    rectFlyDuration: 2000,       // Dauer für Flug in die Ellipse
    counterBaseDelay: 300,       // Start der Counter NACH Start der Rects
    counterStagger: 400,         // Staffelung zwischen den drei Zeilen
    counterFadeIn: 700,          // Fade-in Dauer pro Text
    counterCountDuration: 2000,  // Zähl-Animation pro Text
    holdAfterAllDone: 500,       // kurze Pause bevor Exit
    counterFadeOut: 600,         // Counter-Fade-out vor Rect-Exit
    rectExitDelay: 0,            // ggf. staffeln beim Rausfliegen
    rectExitDuration: 1500,      // Dauer Rect-Exit
    rectExitHold: 0              // Pause vor dem Dispatch (optional)
  };


  // Array mit Zielwerten
  const counters = [
    { label: 'Ideen',              target: ideenSet.size },
    { label: 'Projektskizzen',     target: skizzen},
    { label: 'Umsetzungsprojekte', target: umsetzungsprojekte}
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

    // Gradient (wie bei dir)
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'ideeGradient')
      .attr('x1', '0%').attr('x2', '100%')
      .attr('y1', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#e73e20');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#883582');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#2b7ab7');

    // ViewBox-Grundlagen
    const vb = container.viewBox.baseVal;

    // ===== 1) RECTS EINFLIEGEN =====
    const n        = ideenSet.size;
    const data     = Array.from({ length: n }, (_, i) => i);
    const rectSize = Math.min(svgHeight, svgWidth) * 0.02;
    const halfSize = rectSize / 2;

    // Ellipse
    const cx = svgWidth / 2;
    const cy = svgHeight * 0.45;
    const rx = svgWidth * 0.5;
    const ry = svgHeight * 0.3;

    const angles = data.map((_, i) => Math.PI + (i / (n - 1)) * Math.PI);
    const jitter = data.map(() => ({
      angle: Math.random() * Math.PI * 2,
      rxF: 0.8 + Math.random() * 0.4,
      ryF: 0.8 + Math.random() * 0.4
    }));

    const rects = svg.selectAll('rect.fly')
      .data(data)
      .join('rect')
      .attr('class', 'fly')
      .attr('width', rectSize)
      .attr('height', rectSize)
      .attr('rx', rectSize * 0.2)
      .attr('fill', 'url(#ideeGradient)')
      .attr('opacity', 0)
      .attr('x', () => randomStartPosition().x)
      .attr('y', () => randomStartPosition().y);

    const tAppear = rects
      .transition()
      .delay((_, i) => i * D.rectAppearDelayStep)
      .duration(D.rectAppearFade)
      .attr('opacity', 0.8);

    const tFlyIn = tAppear
      .transition()
      .duration(D.rectFlyDuration)
      .ease(easeBackOut)
      .attr('x', (_, i) => cx + Math.cos(jitter[i].angle) * rx * jitter[i].rxF - halfSize)
      .attr('y', (_, i) => cy + Math.sin(jitter[i].angle) * ry * jitter[i].ryF - halfSize);

    const rectsArrived = waitAllEnd(tFlyIn);

    // ===== 2) COUNTER STARTEN (kurz nach Rect-Start) =====
    const counters = [
      { label: 'Ideen',              target: ideenSet.size },
      { label: 'Skizzen',     target: skizzen },
      { label: 'Umsetzungsprojekte', target: umsetzungsprojekte }
    ];

    const startCounters = () => {
      const startX = vb.width / 7;
      const lineH  = 250;
      const texts = [];

      const promises = counters.map((c, i) => {
        const text = svg.append('text')
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
        texts.push(text);

        return new Promise((resolve) => {
          text.transition()
            .delay(D.counterBaseDelay + i * D.counterStagger)
            .duration(D.counterFadeIn)
            .attr('opacity', 1)
            .on('end', () => {
              const ctrl = animate(0, c.target, {
                duration: D.counterCountDuration / 1000, // motion in Sekunden
                easing: 'cubic-out',
                onUpdate(v) {
                  text.text(`${Math.round(v)} ${c.label}`);
                }
              });
              // motion liefert eine Promise unter .finished
              ctrl.finished.then(resolve);
            });
        });
      });

      return Promise.all(promises);
    };

    const countersDone = startCounters();

    // ===== 3) EXIT-SEQUENZ: erst Counter weg, dann Rects raus =====
    Promise.all([rectsArrived, countersDone])
      .then(() => delay(D.holdAfterAllDone))
      .then(() => fadeCounters(svg))
      .then(() => exitRects(rects))
      .then(() => {
        dispatch('finished');
      });
  });

  // === Helper: alle Transitions zu Ende ===
  function waitAllEnd(transition) {
    return new Promise((resolve) => {
      let pending = 0;
      transition.each(() => { pending += 1; });
      transition.on('end', () => {
        pending -= 1;
        if (pending === 0) resolve();
      });
    });
  }
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function fadeCounters(svg) {
    const t = svg.selectAll('text.end-counter')
      .transition()
      .duration(D.counterFadeOut)
      .attr('opacity', 0)
      .remove();
    return waitAllEnd(t);
  }

  function exitRects(rects) {
    const t = rects
      .transition()
      .delay((_, i) => D.rectExitDelay ? i * D.rectExitDelay : 0)
      .duration(D.rectExitDuration)
      .attr('opacity', 0)
      .attr('x', () => randomStartPosition().x)
      .attr('y', () => randomStartPosition().y)
      .on('end', function () { select(this).remove(); });

    return waitAllEnd(t).then(() => delay(D.rectExitHold));
  }
</script>


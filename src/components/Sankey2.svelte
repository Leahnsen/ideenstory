<!-- @ts-nocheck -->
<script>
    // @ts-nocheck
    
      import { onMount } from "svelte";
      import { json } from "d3-fetch";
      import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
      import { scaleOrdinal } from 'd3-scale';
      //Simport {writeable } from 'svelte/store';
    
      let rawData = [];
      let sankeyData = { nodes: [], links: [] };
    
      // vier Stationen (Stages)
      const stages = ["Idee", "Projektskizze", "Maßnahme", "Umsetzungsprojekt"];
    
      onMount(async () => {
        rawData = await json("/sankey.json");
    
        // Erstelle Nodes: Für jede Station sammeln wir alle eindeutigen Werte.
        let nodes = [];
        let nodesMap = {}; // Map: key = "Stage:Wert" -> Index in nodes
        stages.forEach((stage, i) => {
          // Werte in dieser Station ermitteln:
          let values = new Set();
          rawData.forEach(record => {
            let value;
            if(i === 0) value = record.idee;
            else if(i === 1) value = record.projektskizze;
            else if(i === 2) value = record.maßnahme;
            else if(i === 3) value = record.umsetzungsprojekt;
            if(value !== undefined && value !== null && value !== "") {
              values.add(value);
            }
          });
          values.forEach(val => {
            // Erstelle für jede eindeutige Kombination einen Node
            let key = `${stage}:${val}`;
            let node = { id: key, name: val, stage: stage };
            nodes.push(node);
            nodesMap[key] = nodes.length - 1;
          });
        });
    
       // Erstelle Links: Jeder Datensatz erzeugt einen Fluss von Station zu Station.
    // Dabei wird im Übergang in die nächste Station geprüft, ob das Feld mehrere Werte enthält.
    function splitValue(val) {
      if (!val) return [];
      if (val.indexOf(",") !== -1) {
        return val.split(",").map(s => s.trim());
      }
      return [val];
    }
    
    // Erstelle Links: Jeder Datensatz erzeugt einen Fluss von Station zu Station.
    let rawLinks = [];
    rawData.forEach(record => {
      let flow = [
        { stage: "Idee", value: record.idee },
        { stage: "Projektskizze", value: record.projektskizze },
        { stage: "Maßnahme", value: record.maßnahme },
        { stage: "Umsetzungsprojekt", value: record.umsetzungsprojekt }
      ];
    
      // Für jede benachbarte Station
      for (let i = 0; i < flow.length - 1; i++) {
        // Quellwerte aufsplitten
        let sourceVals = splitValue(flow[i].value);
        // Zielwerte aufsplitten
        let targetVals = splitValue(flow[i+1].value);
    
        sourceVals.forEach(sv => {
          targetVals.forEach(tv => {
            if (sv && tv) {
              let sourceKey = `${flow[i].stage}:${sv}`;
              let targetKey = `${flow[i+1].stage}:${tv}`;
              // Nur hinzufügen, wenn Node existiert
              if (nodesMap[sourceKey] !== undefined && nodesMap[targetKey] !== undefined) {
                rawLinks.push({
                  source: nodesMap[sourceKey],
                  target: nodesMap[targetKey],
                  value: 1
                });
              }
            }
          });
        });
      }
    });
    
    // Danach wie gehabt aggregieren
    let linksMap = {};
    rawLinks.forEach(link => {
      const key = link.source + "->" + link.target;
      if (linksMap[key]) {
        linksMap[key].value += link.value;
      } else {
        linksMap[key] = { ...link };
      }
    });
    let links = Object.values(linksMap);
    //@ts-ignore
    sankeyData = { nodes, links };
    
        updateSize();
        console.log("hier bin ic");
        //window.addEventListener("resize", updateSize);
        
       
    
      });
    
    
        //Start with the viz setup
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      let width, height;
    
    function updateSize() {
      
    
      const screenWidth = window.innerWidth || 1800;
      const screenHeight = window.innerHeight || 3000;
    
      width = Math.min(screenWidth * 0.9, 1800); // Max 1800px, sonst 90% der Breite
      height = Math.min(screenHeight * 0.80, 3000);
      console.log(width, height); 
      sankeyDataReadyToUse();
    
    }
    
    
    
    
    
     let sankeyGeneratorDetails = sankey()
          .nodeWidth(width * 0.015)//horizontal space between nodes
          // @ts-ignore
          .nodePadding(height * 0.015) //vertical space between nodes
          .extent([ //overall layout boundaries
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom]
          ]);
    
      
    
     
    
    
    
    //data muss durch den sankey generator, um positions zu kalkulieren (output wie sankeyData, nur mit Layout Daten )
    let sankeyDataReady;
    function sankeyDataReadyToUse(){
      if (sankeyData.nodes.length > 0) {
        //ruf die sankey generator Funktion auf und erhalte die berechneten Daten
          sankeyDataReady = sankeyGeneratorDetails ({
            //@ts-ignore
            nodes: sankeyData.nodes.map(d => ({ ...d })),
            //@ts-ignore
            links: sankeyData.links.map(d => ({ ...d }))
          });
          console.log("aus sankeyDataReady", sankeyDataReady);
      } else {
        console.log("sankeyData.nodes ist leer oder ungültig");
        sankeyDataReady = null;
      }
    }
    
    
    // Color scale for nodes
    const colorScale = scaleOrdinal().range([
        '#66c2a5',
        '#fc8d62',
        '#8da0cb',
        '#e78ac3',
        '#a6d854',
        '#ffd92f',
        '#e5c494',
        '#b3b3b3'
      ]);
    
    
      const linkGenerator = sankeyLinkHorizontal();
    
        // Eine Hilfsfunktion, die prüft, ob der Name ein "Keine ..." oder "Kein ..." Eintrag ist.
        function isKeine(name) {
        if (!name) return false;
        const lower = name.toLowerCase();
        return lower.includes("keine projektskizze")
          || lower.includes("keine maßnahme")
          || lower.includes("kein umsetzungsprojekt");
      }
      console.log("HII", sankeyData.links.map(d => d.value));
    
      
    </script>
    <div
      class="relative w-full max-w-none rounded-xl p-6"
      bind:clientWidth={width}>
      <h1 class="text-xl font-bold text-gray-200 mb-6 text-center">
        Ideenreise
      </h1>
    
      {#if sankeyDataReady}
      <svg {width} {height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin meet">
    
          <!--Für vertikale Darstellung: Alles Gruppieren, dann rotieren, dann verschieben
          <g transform="rotate(-90) translate(-{height},0)">-->
          <!-- Links -->
    
    
          {#each sankeyDataReady.links as link}
            <path
              d={linkGenerator(link)}
              fill="none"
              stroke={colorScale(link.source.name)}
              stroke-opacity="0.8"
              stroke-width={Math.max(1, link.width)}
              opacity={isKeine(link.source.name) || isKeine(link.target.name) ? 0.4 : 1}
              class="link" />
          {/each}
    
          <!-- Nodes -->
          {#each sankeyDataReady.nodes as node}
            <g class="node" transform="translate({node.x0},{node.y0})">
              <rect
                height={node.y1 - node.y0}
                width={node.x1 - node.x0}
                fill={colorScale(node.name)}
                class="node-rect">
               <title>{node.name}: {node.value}</title>
              </rect>
    
             {#if node.stage !== "Idee" } 
              <text
                x={node.x0 < width / 2 ? node.x1 - node.x0 + 6 : -6}
                y={(node.y1 - node.y0) / 2}
                dy="0.35em"
                text-anchor={node.x0 < width / 2 ? 'start' : 'end'}
                style="font-size: {Math.max(15, width * 0.008)}px"
                class="fill-black-200 text-xs">
                {node.name}
              </text>
              {/if}
    
    
            <!-- Für jeden Node, der eine Idee repräsentiert, wird ein Rechteck gezeichnet.x,y =0, weil in g schon oben translated -->
            {#if node.stage === "Idee"}
                <rect 
                      class="fill-gray-200" 
                      x=0 
                      y=0
                      width={10} 
                      height={10}>
                </rect>
            {/if}
            
    
            </g>
          {/each}
         
        </svg>
      {/if}
    </div>
    
    
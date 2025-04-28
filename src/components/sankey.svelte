<script>
  // @ts-nocheck
  import { createEventDispatcher, onMount } from "svelte";
  import { json } from "d3-fetch";
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
  import { scaleOrdinal } from 'd3-scale';
	import { get } from "svelte/store";
  import { writable } from "svelte/store";
  import { transition } from "d3-transition";
  import { select } from "d3-selection";
  import { easeLinear } from "d3-ease";
  import { draw, fade, slide } from "svelte/transition";
	import { bin, reduce } from "d3";
  import { tick } from "svelte";




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
  const stages = ["Idee", "Projektskizze", "Maßnahme", "Umsetzungsprojekt"];


  export let sankeyNodeMap = {};
  let linkGen = sankeyLinkHorizontal();

$: if (sankeyDataReady) {
  sankeyNodeMap = {};
  sankeyDataReady.nodes.forEach(node => {
    if (node.stage === "Idee") {
      sankeyNodeMap[node.name] = { x: node.x0, y: node.y0 };
    }
  });
}


//Vorverarbeitung für die Farbkategorien

  function getcolorForIdea(idee) {
    let ideeEintrag = allData.find(d=> d.idee ===idee);
    //console.log(` Farbe für Idee "${idee}":`, ideeEintrag?.kategorie, "→", farbSkala(ideeEintrag?.kategorie));
    return ideeEintrag ? farbSkala(ideeEintrag.kategorie) : "#888";
    
  }

  
// Einzelne Idee hervorheben
let activeIdea = null; //  Speichert die aktuell hervorgehobene Idee

function highlightIdea(ideaName) {
    activeIdea = ideaName;
}

function resetHighlight() {
    activeIdea = null;
}

function isPartOfHighlightedPath(node) {
        return activeIdea && node.originalIdea === activeIdea;
    }

function isLinkHighlighted(link) {
        return activeIdea && link.source.originalIdea === activeIdea;
    }

function getColorForMeasure(measure) {
    if (!measure || measure.includes("Keine Maßnahme")) return "#888"; // Grau für "Keine Maßnahme"

    const measureColors = {
        "Bewegen": "#e73e20",
        "Informieren": "#2b7ab7",
        "Teilhaben": "#883582",
        "Bewahren": "#1c9741"
    };

    return measureColors[measure];
}


    
onMount(async () => {
  const svg = select(container);
  

 
 rawData = await json("/sankey.json");




 // Mapping von Ideen zu Kategorien erstellen
 let ideaToCategory = {};
 allData.forEach(record => {
     if (record.idee) {
         ideaToCategory[record.idee] = record.kategorie || "Ohne Kategorie";
     }
 });

 // Ideen nach Kategorie gruppieren
 let groupedIdeas = {};
 rawData.forEach(record => {
     let category = ideaToCategory[record.idee] || "Ohne Kategorie"; // Kategorie aus Mapping holen
     if (!groupedIdeas[category]) groupedIdeas[category] = [];
     groupedIdeas[category].push(record);
 });

 // Sortierte Nodes nach Kategorie erstellen
 let nodes = [];
 let nodesMap = {};

 Object.keys(groupedIdeas).forEach(category => {
     groupedIdeas[category].forEach(record => {
         let value = record.idee;
         if (value !== undefined && value !== null && value !== "") {
             let key = `Idee:${value}`;
             if (!nodesMap[key]) {
                 let node = { 
                     id: key, 
                     name: value, 
                     stage: "Idee",
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
     rawData.forEach(record => {
         let value;
         if(i === 0) value = record.projektskizze;
         else if(i === 1) value = record.maßnahme;
         else if(i === 2) value = record.umsetzungsprojekt;
         if(value !== undefined && value !== null && value !== "") {
             values.add(value);
         }
     });

     values.forEach(val => {
         let splittedValue= splitValue(val, stage);

         splittedValue.forEach(splittedval => {
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
  if (stage === "Maßnahme" || stage === "Umsetzungsprojekt" && val.includes(",")) {
    let parts= val.split(",").map(s => s.trim()); // wenn Maßnahme, dann kommaseparierte Werte
    return parts;
  }
  return [val]; // Falls kein Komma, dann nur ein Eintrag wie zuvor
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
    // Ursprungswerte aufsplitten
    let sourceVals = splitValue(flow[i].value, flow[i].stage);
    // Zielwerte aufsplitten
    let targetVals = splitValue(flow[i+1].value, flow[i+1].stage);

    sourceVals.forEach(sv => {
      targetVals.forEach(tv => {
        if (sv && tv) {
          let sourceKey = `${flow[i].stage}:${sv}`;
          let targetKey = `${flow[i+1].stage}:${tv}`;

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
      };
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
sankeyData = { nodes, links };



sankeyGenerator = 
    sankey()
      .nodeWidth(70)//horizontal space between nodes
      .nodePadding(9) //vertical space between nodes
      .extent([ //overall layout boundaries
        [margin.left, margin.top],
        [svgWidth - margin.right, svgHeight - margin.bottom]
      ]);
      console.log(svgWidth, svgHeight);


    sankeyDataReadyToUse();

 
});


    //Start with the viz setup

  const margin = { top: 20, right: 20, bottom: 20, left: 20 };


//data muss durch den sankey generator, um positions zu kalkulieren (output wie sankeyData, nur mit Layout Daten )
let sankeyDataReady;
function sankeyDataReadyToUse(){

  if (sankeyData.nodes.length > 0) {
      sankeyDataReady = sankeyGenerator({
        nodes: sankeyData.nodes.map(d => ({ ...d })),
        links: sankeyData.links.map(d => ({ ...d }))
      });




      sankeyDataReady.links.forEach(link => {
          link.width = link.value;



      });
  }
}


function isEmptyTransition(nodeName) {
    const lower = nodeName.toLowerCase();
    return lower.includes("keine projektskizze") || 
           lower.includes("keine maßnahme") || 
           lower.includes("kein umsetzungsprojekt");
}

  const linkGenerator = sankeyLinkHorizontal();

    // Eine Hilfsfunktion, die prüft, ob der Name ein "Keine ..." oder "Kein ..." Eintrag ist.
    function isKeine(name) {
    if (!name) return false;
    const lower = name;
    return lower.includes("Keine Projektskizze")
      || lower.includes("Keine Maßnahme")
      || lower.includes("Kein Umsetzungsprojekt");
  };




// Steuerung für Nodes & Links
let showIdeas = false;
let showProjektskizzen = false;
let showMaßnahmen = false;
let showUmsetzung = false;

let showLinksToProjektskizzen = false;
let showLinksToMaßnahmen = false;
let showLinksToUmsetzung = false;
let showNoProjektskizzenLinks = true;

let reduceOpacity = false;
let increaseLinkWidth = false;



function startSankeyIdeas() {
  
    showIdeas = true;
    signalNextStep();
    
    
  }


function startSankeyProjektskizzen() {
  showLinksToProjektskizzen = true;


     setTimeout(() => {
      showProjektskizzen = true; 
      
  signalNextStep();


},1000);
}




function startSankeyMaßnahmen() {

showLinksToMaßnahmen = true;

setTimeout(() => {
  showMaßnahmen = true; 


    signalNextStep();


},500);
}


function startSankeyUmsetzung() {

showLinksToUmsetzung = true;

setTimeout(() => {
showUmsetzung = true; 

    signalNextStep();


},2000);
}


function startTickerLineWith() {
  // Selektiere alle Links außer die mit Ziel "Keine Projektskizze"
  select("svg")
    .selectAll("path.link")
    .filter(function() {
      return this.dataset.target !== "Keine Projektskizze";
    })
    .each(function() {
      const path = select(this);
      const totalLength = this.getTotalLength();

      path
        .attr("stroke-dasharray", totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(easeLinear)
        .attr("stroke-dashoffset", 0);
    });
}










  let phaseLock = false;
  function signalNextStep() {
    if (phaseLock) return; // Falls schon aktiv, nicht erneut starten
    phaseLock = true;
    console.log("phaseSankeyFromSTartIn der Funktion signal:", phaseSankey);


      setTimeout(() => {
        dispatch("phaseSankeyEnd");
        phaseLock = false; // Phase entsperren für nächsten Schritt

    }, 2000);
}


  // Überprüft, ob ein Idee-Node zu "Keine Projektskizze" führt
  function isIdeaGoingToNoProjektskizze(node) {
    return sankeyDataReady.links.some(
      link => link.source.name === node.name && link.target.name === "Keine Projektskizze"

    );
  }


   
$: if (phaseSankey === 1) {
        startSankeyIdeas();
     }

$: if (phaseSankey === 3) {
        startSankeyProjektskizzen();
     }



$: if (phaseSankey === 6) {
        startSankeyMaßnahmen();
     }

$: if (phaseSankey === 7) {
        startSankeyUmsetzung();
     }


$: if (phaseSankey === 8) {

    increaseLinkWidth = true;
    setTimeout(() => {
      startTickerLineWith();
      
    }, 50)
      

       reduceOpacity = true;
     }






  




</script>



 <!--<div class="container">
 <h1 class="text-xl font-bold text-smblue mb-6 text-center">
    
  </h1>
-->
  {#if sankeyDataReady}
  <g class="sankey-layer">

    <!-- <svg  viewBox="0 0 {width} {height}"preserveAspectRatio="xMinYMin meet">
   Links -->

   {#each sankeyDataReady.links as link (link.source.name + "-" + link.target.name )}
   {#if (
     (link.source.stage === "Idee" && link.target.stage === "Projektskizze" && showLinksToProjektskizzen) ||
     (link.source.stage === "Projektskizze" && link.target.stage === "Maßnahme" && showLinksToMaßnahmen) ||
     (link.source.stage === "Maßnahme" && link.target.stage === "Umsetzungsprojekt" && showLinksToUmsetzung) 
     )}
   
       <path
         d={linkGenerator(link)}
         fill="none"
         stroke="url(#smartCityGradient)"
         stroke-width={ 
            link.target.name === "Keine Projektskizze" && reduceOpacity ? 0.5 :
             Math.max(3, link.width + 3)
            
          }
         opacity={ link.target.name === "Keine Projektskizze" && reduceOpacity ? 0.3 : 0.8 }
         transition:draw={{ duration: 2000 }}
         class="link"
       />
 
   {/if}
 {/each}


 

      <!-- Nodes -->
      {#each sankeyDataReady.nodes as node (node.stage + "-" + node.name)}
      {#if (
        (node.stage === "Idee" && showIdeas) ||
        (node.stage === "Projektskizze" && showProjektskizzen) ||
        (node.stage === "Maßnahme" && showMaßnahmen) ||
        (node.stage === "Umsetzungsprojekt" && showUmsetzung)
      )}
        <g 
          class="node" 
          transform="translate({node.x0},{node.y0})"
          transition:fade={{ duration: 1000 }}
        >
          <rect
            height={node.y1 - node.y0}
            width={node.x1 - node.x0}
            fill={
              node.stage === "Maßnahme" ? getColorForMeasure(node.name) || "grey" :
              "grey"
              }
             opacity={ 
                node.name === "Keine Projektskizze" && reduceOpacity ? 0.1 :
                node.stage === "Idee" && reduceOpacity && isIdeaGoingToNoProjektskizze(node) ? 0.1 :
                0.8
                }  

         
            rx="5" ry="5"
            class="node-rect"
          />
          
          <!-- Für jeden Node, der eine Idee repräsentiert, wird ein Rechteck gezeichnet.x,y =0, weil in g schon oben translated  
          
          {#if node.stage === "Idee"}
              <rect 
                    x=0 
                    y=0
                    fill= {getcolorForIdea(node.name)}
                    class= "idee-rect"
                    width={15} 
                    height={15}
                    rx="5" ry="5" 
                    opacity={reduceOpacity && isIdeaGoingToNoProjektskizze(node) ? 0.1 : 1}  
                    >
              </rect>
          {/if}
          -->
           

          {#if node.stage === "Maßnahme"}
            <image
              x="10"
              y="10"
              width={node.x1 - node.x0 }
              height={node.y1 - node.y0 }
              href={"./icons/" + node.name + ".svg"}
            />
          {/if}
          {#if node.stage === "Maßnahme" }
          <text
            x={node.x0 < svgWidth/ 2 ? node.x1 - node.x0 + 6 : -6}
            y={(node.y1 - node.y0) / 2}
            text-anchor={node.x0 < svgWidth / 2 ? 'start' : 'end'}
            class="fill-gray-800 text-2xl md:text-3xl lg:text-3xl font-bold"
          >
            {node.name}
          </text>
          {/if}


        </g>
      {/if}
    {/each}
    



     
<!--! Gradient -->
  <defs>
    <linearGradient id="smartCityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e73e20" /> 
      <stop offset="50%" stop-color="#883582" /> <!-- smpurple -->
      <stop offset="100%" stop-color="#2b7ab7" /> <!-- smblue -->
    </linearGradient>
  </defs>
  
    <!--</svg>-->
</g>
  {/if}

<!--</div>

<style>
.sankey-container {
    width: 90vw;  /* Nimmt die gesamte Breite des Bildschirms */
    max-width: 90vw; /* Begrenze auf 90% der Bildschirmbreite */
    height: auto; /* Höhe bleibt proportional */
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden; /* Verhindert Scroll-Bars */
}



</style>
-->
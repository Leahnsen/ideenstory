<script>
    // @ts-nocheck
    import Ideen2Ideengeber from "./Ideen2Ideengeber.svelte";
    //import BarChart from "./BarChart.svelte";
    import Texte from "./Texte.svelte";
    import { json } from "d3-fetch";

    import { onMount } from "svelte";
    import Sankey from "./sankey.svelte"; 
    import { writable } from "svelte/store";
    import {scaleOrdinal} from 'd3-scale';
    import * as d3 from "d3-scale-chromatic";


    
  // Props
  export let allData = [];
  export let catCount = [];
  export let farbSkala;
  let phaseLock = false;

  // Steuerung der Phasen
  export let phase = writable(0);        // 0–Intro/Text, 1–Ideen2Ideengeber
  export let phaseSankey = writable(0);  // 0–Sankey nicht gezeigt, ≥1 Sankey-Phasen

  // Gemeinsame SVG-Dimensionen
  let svgContainer;
  let svgWidth = window.innerWidth * 0.9;
  console.log("svgWidth data story", svgWidth);
  let svgHeight = window.innerHeight * 0.9;
  console.log("svgHeight data story", svgHeight);
  //Position des Texts nach Phase ändern
  let phaseTop;
  let phaseLeft;
  let width;

 

    // Liste von Story-Schritten mit passenden Texten
    const storySteps = [
        "<strong class='text-smblue'> Am Anfang waren Ideen. </strong> Smart City startete im Jahr 2021 mit einer Ideensammlung für ein smartes Bamberg. Alle Bürger:innen konnten sich beteiligen und Ideen einreichen,  mit denen die Stadt verbessert werden könnte.",
        "Insgesamt wurden <strong> 268 </strong> Ideen abgegeben. Jede Idee ist als <strong class='bg-gradient-to-r from-smred via-smpurple to-smblue text-transparent bg-clip-text'> Quadrat </strong>dargestellt.",
        "Hinter diesem <strong class='bg-gradient-to-r from-smred via-smpurple to-smblue text-transparent bg-clip-text'>Quadrat</strong> stecken Ideen wie diese: <dl class='space-y-2'><div> <dt class='font-bold'>Idee:</dt><dd class='opacity-60'>Dachwassernutzung</dd></div><div>     <dt class='font-bold'>Problem:</dt> <dd class='opacity-60'>Wassermangel der Stadtbäume</dd></div><div><dt class='font-bold'>Lösung:</dt> <dd class='opacity-60'>Regenwasser, das auf Hausdächer fällt, soll zur nächsten Grünfläche (Garten, Grünstreifen, Park) geleitet werden, um dort zu versickern.</dd>  </div>  </dl>",
        "Die Ideen stammen von Bamberger Bürger:innen. <strong> 79 Menschen und Organisationen</strong> haben Ideen eingereicht.",
        "Teilnehmende Bürger:innnen gaben unterschiedlich viele Ideen ab.",
        "Im Schnitt reichten Bürger:innen <strong class='bg-gradient-to-r from-smred via-smpurple to-smblue text-transparent bg-clip-text'> 3,5 </strong> Ideen ein.",
        "Ein paar sprudelten nur so vor Verbesserungsorschlägen. Hier gab jemand 39 Ideen an, die Bamberg zu einer smarteren Stadt machen könnten.", 
        "Jetzt wird es bunt - Smart City hat die Ideen kategorisiert nach Themengebieten. <strong class='text-hellgrün'>Grün</strong> sticht am meisten ins Auge: Dahinter stecken Ideen für den Themenbereich wie <strong class='text-hellgrün'>\"Serviceleistungen der Stadt\"</strong>",
        "Am meisten lag den Bambergern eine Veränderung im Bereich \"Serviceleistungen der Stadt\" am Herzen.", 
        "Für \"Bildung und Forschung\" wurden dagegen am seltensten Ideen eingereicht.",
        "<strong>Was ist aus diesen Ideen seit 2021 geworden?</strong>",
    ];

    

function handlePhaseEnd() {
    if (phaseLock) return;  // Verhindert doppelte Aufrufe innerhalb einer Phase
    phaseLock = true;


    phase.update(n => n + 1);
   // console.log("phase after n+1", $phase);

    setTimeout(() => {
        phaseLock = false;  // Nach kurzer Zeit wieder freigeben
    }, 3000);
}



    $: {
      if($phase === 0|| $phase === 1 ||$phase === 2 || $phase === 10) {
        phaseTop = "30vh";
        phaseLeft = "20vw";
        width = "50vw";
      } else if($phase === 8 || $phase === 9 ) {
        phaseTop = "55vh";
        phaseLeft = "50vw";
        width = "40vw";
      } else if($phase === 3) {
        phaseTop = "40vh";
        phaseLeft = "35vw";
        width = "25vw";     
      } else {
        phaseTop = "40vh";
        phaseLeft = "60vw";
        width = "30vw";
      }
    }



$: if ($phase < storySteps.length) {
    // Timer nur für Textphasen starten (keine D3 Animation vorhanden)
    if ($phase <= 10 && $phase !== 2 && $phase !== 3 && $phase !== 4 && $phase !== 6 && $phase !== 5 &&$phase !==  7 && $phase !== 8) {
            //    const delay = storyDelays[$phase] || 5000; // Standard: 5s
        setTimeout(handlePhaseEnd, 4000);
    }
}


//const storyDelays = [5000, 5000, 7000, 4000, 6000, 8000, 5000, 6000, 5000];


//Story/Anmiationsmanager für Sankey

  const storyStepsSankey =[
    {
        text: "Das werden wir uns jetzt genauer ansehen.",
        top: "20vh", left: "20vw", width: "40vw"
    }, 
    {
        text: "TODO: Die gesammelten Ideen kommen ins Bild animiert",
        top: "20vh", left: "20vw", width: "40vw",
    },
    {
        text: "Hier sind wieder die Ideen von vorhin.",
        top: "20vh", left: "20vw", width: "60vw",
    },
    {
      text: "Im nächsten Schritt entschied ein Team von Smart City über die Weiterentwicklung der Ideen: Welche können nicht weiter verfolgt werden?",
      top: "15vh", left: "20vw", width: "40vw",
    },
    {   text: "Insgesamt wurden XX Ideen erstmal auf Eis gelegt.",
        top: "20vh", left: "10vw", width: "60vw",
    },
    {   text: "Das sieht nach viel aus. Bedeutet aber auch, dass XX Ideen in die nächste Phase genommen wurden.",
        top: "20vh", left: "10vw", width: "40vw",
    },

    {   text: "Es wurden 18 Projektskizzen erstellt. Dafür wurden oft mehrere Ideen zu einem Projekt zusammengefasst,",
        top: "20vh", left: "10vw", width: "40vw",
    },

    {   text: "BEISPIEL: Projektskizze mit vielen Ideen, aus der am Ende auch was wurde (Bsp für alle Stages verwenden)",
        top: "20vh", left: "10vw", width: "40vw",
    },
    
  ]
  
  let phaseLock2 = false;

  function handleSankeyPhaseEnd(){
    //console.log("handleSankey before n+1 & retzrn", $phaseSankey);
    if (phaseLock2) return;  // Verhindert doppelte Aufrufe innerhalb einer Phase
    phaseLock2 = true;
   // console.log("phaseSankeyds beforw n+1", $phaseSankey);

    phaseSankey.update(n => n + 1);
   //console.log("phaseSankeyds after n+1", $phaseSankey);


    setTimeout(() => {
        phaseLock2 = false;  // Nach kurzer Zeit wieder freigeben
    }, 1000);
  
  }


  $: if ($phase === storySteps.length && $phaseSankey <= storyStepsSankey.length) {
   //console.log("phaseSankeyds", $phaseSankey);
    
    // Nur ausführen, wenn der aktuelle Schritt NICHT einer der speziellen Schritte ist
    if ($phaseSankey !== 1 && $phaseSankey !== 3 && $phaseSankey !== 6 && $phaseSankey !== 7) {
    setTimeout(handleSankeyPhaseEnd, 2000);
} 
}


</script>

    
<main class="w-full h-full flex flex-col items-center justify-center p-6">
  <!-- unser einziger SVG-Container -->
  <svg bind:this={svgContainer}
       viewBox={`0 0 ${svgWidth} ${svgHeight}`}
       preserveAspectRatio="xMinYMin meet"
       class="svg-container">

    {#if svgContainer}
      {#if $phase <= 10}
        <Ideen2Ideengeber
          container={svgContainer}
          allData={allData}
          catCount={catCount}
          farbSkala={farbSkala}
          phase={$phase}
          on:phaseEnd={handlePhaseEnd}
       
        />
      {/if}

      {#if $phaseSankey <= 10}


        <Sankey
          container={svgContainer}
          allData={allData}
          farbSkala={farbSkala}
          phaseSankey={$phaseSankey}
          svgHeight={svgHeight}
          svgWidth={svgWidth}
          on:phaseSankeyEnd={handleSankeyPhaseEnd}
        />
      {/if}
    {/if}
  </svg>

  <!-- Texte als Overlay außerhalb des SVG -->
  {#key phaseTop}
    <Texte
      text={$phase < storySteps.length ? storySteps[$phase] : " "}
      top={phaseTop}
      left={phaseLeft}
      width={width}
    />
  {/key}
  {#if $phase === storySteps.length && $phaseSankey <= 10}

  {#key $phaseSankey}
  {#if storyStepsSankey[$phaseSankey]}
    <Texte 
      text={storyStepsSankey[$phaseSankey].text} 
      top={storyStepsSankey[$phaseSankey].top}
      left={storyStepsSankey[$phaseSankey].left}
      width={storyStepsSankey[$phaseSankey].width}
    />
  {/if}
{/key}
  {/if}
</main>
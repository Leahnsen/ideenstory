<script>
  // @ts-nocheck
    import { onMount, createEventDispatcher } from 'svelte';
    import { select } from "d3-selection";
    import { transition } from "d3-transition";
    import { scaleOrdinal } from "d3-scale";
    import * as d3 from "d3-scale-chromatic";
    import { xml } from 'd3-fetch';
    import Sankey from './sankey.svelte';
    import { max } from 'd3-array';




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
        dispatch("phaseEnd");
        phaseLock = false; // Phase entsperren für nächsten Schritt
    }, 2000);
}

  
  const dispatch = createEventDispatcher(); // Event-Dispatcher, um das Story-Update zu triggern
    
/*/SVG resposive
let aspectRatio = 1700 / 2900; // Ursprüngliches Verhältnis
let svgWidth = window.innerWidth * 0.9;
let svgHeight = svgWidth / aspectRatio;

*/
    
//Kategorien und Farben
//Umwandlung der Kategorien in Set
    const katSammlung = new Set(allData.map(d => d.kategorie));
//D3 Funktionen erwarten aber Array mit Index als Eingabe   [...katSammlung]... ist Spread Operator und wandelt um in Array
//Alternativ: const katSammlungArray = Array.from(katSammlung);  
    const katSammlungArray= [...katSammlung];

    
   /* const farbSkala = scaleOrdinal()
        .domain(katSammlungArray)
          
        .range(d3.schemeCategory10);
*/

    // Layout für Ideengeber-Rects
  const rectSize = svgWidth * 0.08; // 9% der Breite
  const gap = svgWidth * 0.02; // 1% der Breite
  const columns= 5; 
  //const columns = Math.floor(svgWidth / (rectSize + gap));


    // **Eindeutige Liste der Ideengeber erstellen**
    let eindeutigeIdeengeber = Array.from(
        new Set(allData.map(d => d.ideengeber))
    ).map(ideengeber => ({
        ideengeber, 
        ideen_count: allData.filter(d => d.ideengeber === ideengeber).length // Anzahl der Ideen pro Ideengeber zählen
    }));

    //Durchnschnittliche Ideen pro Ideengeber
    let averageIdeen = 0; 
    eindeutigeIdeengeber.forEach(ideengeber => {
        averageIdeen += ideengeber.ideen_count;
    });
    averageIdeen = (averageIdeen / eindeutigeIdeengeber.length).toFixed(1);


    // **Positionen für Ideengeber speichern**
    let positionen = {};
    eindeutigeIdeengeber.forEach((d, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        positionen[d.ideengeber] = {
            x: col * (rectSize + gap) + gap,
            y: row * (rectSize + gap) + gap
        };
    });

   // console.log("Gespeicherte Positionen der Ideengeber:", positionen);

    // **Alle Ideen mit korrektem Index für das Grid speichern**
   let alleIdeen = [];
    eindeutigeIdeengeber.forEach(ideengeber => {
        let ideenListe = allData.filter(d => d.ideengeber === ideengeber.ideengeber);
        ideenListe.forEach((idee, index) => {
            alleIdeen.push({
                idee: idee.idee,
                ideengeber: idee.ideengeber,
                kategorie: idee.kategorie,
                index // Index für jede Idee innerhalb des Ideengebers, bspw. 0-5 (Grid Berechnung der Animation beruht)
            });
        });
    });





    //SVG initialisieren und statische Elemente zeichnen
    onMount(() => {
        svg = select(container)
        .attr("viewBox", container.getAttribute("viewBox"))

          .attr("preserveAspectRatio", "xMinYMin meet"); //gleichmäsige Skalierung bei unterschiedlichen Seitenverhältnissen
        

        //Vorbereitung für die Rects: Gradients für Farbverlauf definieren
        const defs = svg.append("defs");
      
        const gradient = defs.append("linearGradient")
          .attr("id", "ideeGradient")
          .attr("x1", "0%")
          .attr("x2", "100%")
          .attr("y1", "0%")
          .attr("y2", "100%")

          //Farbverlauf definieren
          gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#e73e20"); // Anfangsfarbe

          
          gradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#883582"); // Mitte

          
          gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#2b7ab7"); // Ende
          
      
   
    });




    function drawIdeas() {
  
      setTimeout(() => {
        
      
        // Ideen als kleine Rechtecke zeichnen (Start: zufällig)
        const ideenRects = svg.selectAll(".idee")
            .data(alleIdeen)
            .join("rect")
            .attr("class", "idee")
            .attr("fill", "url(#ideeGradient)")
            .attr("width", rectSize* 0.12) //gleichmäßig zur SVG Größe skalieren
            .attr("height", rectSize* 0.12)
            .attr("x", (d, i) => (i % 7) * rectSize*0.4 +svgWidth*0.75 )  // Grid-Layout am Anfang
            .attr("y", (d, i) => Math.floor(i / 7) * rectSize*0.5)
            .attr("opcaity", 0)
            .transition()
            .duration(3000)
            .attr("opacity", 1)
            .on("end", signalNextStep);


        // **Mouseover Debugging für Ideengeber**
       // svg.selectAll(".ideengeber")
           // .on("mouseover", (event, d) => {
            //    console.log(`Ideengeber: ${d.ideengeber}`);
           // });

    }, 1000);

           // .on("end", signalNextStep);

  
            
     // debugging
       // ideenRects.on("mouseover", (event, d) => {
        //    console.log(`Idee: ${d.idee} | Ideengeber: ${d.ideengeber} | Kategorie: ${d.kategorie}`);
        //});
    }




  function drawIdeengeber() {
    setTimeout(() => {
      
      svg = select(container)
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        // Ideengeber zeichnen
        svg.selectAll(".ideengeber")
            .data(eindeutigeIdeengeber)
            .join("rect")
            .attr("class", "ideengeber")
            .attr("fill", "grey")
            .attr("width", rectSize)
            .attr("height", rectSize)
            .attr("x", d => positionen[d.ideengeber].x)
            .attr("y", d => positionen[d.ideengeber].y)
            .attr("opcaity", 0)
            .transition()
            .duration(3000)
            .attr("opacity", 1);
            //.on("end", signalNextStep);
            signalNextStep();


    }, 2000);
  }

  


    // Ideen fliegen zu ihren Ideengebern & ordnen sich als Grid an
      function ideenToIdeengeber() {

        let ideenRects = svg.selectAll(".idee").raise();
            ideenRects.transition()
                .duration(4000)
                .attr("x", d => {
                    
                    let baseX = positionen[d.ideengeber].x;  
                    let col = d.index % 7;  //modulo 6 -> 6 Spalten Grid 0%6=0, 1%6=1, 2%6=2, 3%6=3, 4%6=4, 5%6=5
                    //console.log(d.ideengeber, " index:", d.index," baseX:", baseX, "col:", col, "final:" , baseX + col * 13);

                    return baseX + col * rectSize*0.14;  // baseX ist linker Rand des rects(für alle Ideen(Ideengeber) gleich), 
                    // Abstand zwischen den Spalten =1 (größe rect 16)
                })
                .attr("y", d =>{
                    let baseY = positionen[d.ideengeber].y;  
                    let row = Math.floor(d.index / 7);  

                    return baseY + row *rectSize*0.14;  // baseY ist oberer Rand des rects(für alle Ideen(Ideengeber) gleich),
                })
                .end()
                .then(() => new Promise(resolve => setTimeout(resolve, 5000)))
                
                .then(() => signalNextStep ());
        }

function highligtAverageIdeas() {

    // Alle Ideengeber hervorheben, die 3 oder 4 Ideen haben
    
    let highlightIdeengeberSchnitt = eindeutigeIdeengeber.filter(d => d.ideen_count === 3 || d.ideen_count === 4);

    // Alle Ideengeber ausgrauen
    svg.selectAll(".ideengeber")
        .transition()
        .duration(1000)
        .attr("opacity", 0.3);

    // Den Ideengeber mit 3 und 4 Ideen hervorheben
    highlightIdeengeberSchnitt.forEach(ideengeber =>{
      svg.selectAll(".ideengeber")
        .filter(d => d.ideengeber === ideengeber.ideengeber)
        .transition()
        .duration(1000)
        .attr("opacity", 0.7)
        .attr("fill", "url(#ideeGradient)"); 

    })


    // Nach 4 Sekunden zurücksetzen & zur nächsten Phase übergehen
    setTimeout(() => {
        svg.selectAll(".ideengeber")
            .transition()
            .duration(1000)
            .attr("opacity", 1)
            .attr("fill", "grey"); 
            

        signalNextStep();

    }, 4000);
}


        

function highlightMaxIdeas() {

    // Ideengeber finden, der 39 Ideen hatte
    let highlightIdeengeber = eindeutigeIdeengeber.find(d => d.ideen_count === 39);

    // Alle Ideengeber ausgrauen
    svg.selectAll(".ideengeber")
        .transition()
        .duration(1000)
        .attr("opacity", 0.3);

    // Den Ideengeber mit 39 Ideen hervorheben
    svg.selectAll(".ideengeber")
        .filter(d => d.ideengeber === highlightIdeengeber.ideengeber)
        .transition()
        .duration(1000)
        .attr("opacity", 0.7)
        .attr("fill", "url(#ideeGradient)"); // Optional: Goldene Farbe für mehr Aufmerksamkeit

    // Nach 4 Sekunden zurücksetzen & zur nächsten Phase übergehen
    setTimeout(() => {
        svg.selectAll(".ideengeber")
            .transition()
            .duration(1000)
            .attr("opacity", 1)
            .attr("fill", "grey"); // Standardfarbe zurücksetzen

        signalNextStep();
    }, 4000);
}






  //Die Ideen werden eingefärbt, basierend auf ihrer Kategorie.
  function colorIdeas() {
  
    let ideenRects = svg.selectAll(".idee");
    ideenRects.transition()
      .duration(1000)
      .attr("opacity", 0.5)

      
    .transition()
      .duration(3000)
      .delay(1000)
      .attr("fill", d => farbSkala(d.kategorie))
      .attr("opacity", 1)
      .end()

      .then(() => new Promise(resolve => setTimeout(resolve, 3000)))
      .then(() => signalNextStep());
  }




    function ideasToBarChart() {  
        fadeOutIdeengeberRects();
        let ideenRects = svg.selectAll(".idee");
        ideenRects.transition()
                .duration(2000)
                //.delay(1000)  // Kürzere Wartezeit
                .attr("x", d => {
                    let barX = barChartX; // Startposition der Balken
                    let barIndex = catCount.findIndex(c => c.kategorie === d.kategorie);
                    let barWidth = (catCount[barIndex]?.count || 1) * 10; // Balkenbreite anhand der Häufigkeit
                    let col = d.index % 6;  
                        return barX + col * (barWidth / 8); // Ideen gleichmäßig verteilen
                    })
                .attr("y", d => {
                    let barBaseY = barChartY + catCount.findIndex(c => c.kategorie === d.kategorie) * (barHeight + barSpacing);
                    let row = Math.floor(d.index / 8);  
                    return barBaseY + row * 12;  // Innerhalb des Balkens in Reihen anordnen
                     })
                        

                    .end()
                    .then(()=> {
                            //console.log(`Idee ${d.idee} wurde in Bar für ${d.kategorie} geparkt.`);  
                            renderBarChartOrganic();

                            setTimeout(() => {
                              signalNextStep();
                            },4000);
                            
                    });
        };

function fadeOutIdeengeberRects() {
    svg.selectAll(".ideengeber")
      .transition()
      .duration(2000)
      .attr("opacity", 0)
      .remove();
  }


//Bar Chart Vorbereitung   
const barChartX = 280; 
const barChartY = 350; 
const barHeight = svgHeight * 0.03; // 3% der SVG-Höhe
const barSpacing = svgHeight * 0.04; // 2% der SVG-Höhe
const hSpacing = 47;  // horizontaler Abstand zwischen Rects
const vSpacing = 47;  // vertikaler Abstand (für die 2 Zeilen)



// Sortiere Kategorien nach Größe für Bar Chart
catCount.sort((a, b) => b.count - a.count); 
let categoryPositions = {}; 
catCount.forEach((d, i) => {
    categoryPositions[d.kategorie] = barChartX + i * barSpacing;
});


function renderBarChartOrganic() {

    // Gruppiert Rects nach Kategorie.
    const categories = Array.from(new Set(allData.map(d => d.kategorie)));
    
    categories.forEach(cat => {
        const rects = svg.selectAll(".idee").filter(d => d.kategorie === cat);
        const numRects = rects.size();
        if(numRects === 0) return;

        const numCols = Math.ceil(numRects / 2); //Fix: 2 Zeilen, darauf aufbauend berechnen, wie viele Spalten

        const catIndex = catCount.findIndex(d => d.kategorie === cat); //index der Kategorie

       //transtition start für die kleinen ideen rects
        // Die x-Position berechnet sich aus der Spaltenposition, die y-Position aus dem Startwert plus
    // dem Offset der Kategorie plus der Zeilenverschiebung (0 oder 1)
        rects.transition()
            .duration(1500)
            .delay((d, i) => i * 30) //gestaffelter delay => Endruck von organischem zusammenfließen
            .attr("x", (d, i) => barChartX+(i % numCols) * hSpacing)
            .attr("y", (d, i) => barChartY + catIndex * (barHeight + barSpacing) + Math.floor(i / numCols) * vSpacing)
            .attr("width", 40)
            .attr("height", 40)
            .attr("fill", d => farbSkala(d.kategorie));
    });
  
  const labels = svg.selectAll(".bar-label")
    .data(catCount)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", barChartX - 150)  // 10px links vom Start des Balkenbereichs
    .attr("y", (d, i) => barChartY + i * (barHeight + barSpacing) -5)
    .attr("font-size", svgWidth * 0.025)
    .attr("font-family", "Inter, sans-serif")
    .text(d => d.kategorie)
    .attr("opacity", 0);
    /*.each(function(d) {
    // 1) Split am ersten Leerzeichen:
    const [first, ...rest] = d.kategorie.split(" ");
    const second = rest.join(" ");
    // 2) Clear text, damit wir mit <tspan> neu bauen:
    select(this).text("");
    // 3) Erste Zeile
    select(this)
      .append("tspan")
        .attr("x", this.getAttribute("x"))
        .attr("dy", "0em")
        .text(first);
    // 4) Zweite Zeile (falls vorhanden)
    if (second) {
      select(this)
        .append("tspan")
          .attr("x", this.getAttribute("x"))
          .attr("dy", "1.2em")
          .text(second);
    }
  }); */


    //Füge Text hinzu, der die Anzahl der Ideen anzeigt – platziert am rechten Rand der Bar.
    const counts= svg.selectAll(".bar-count")
    .data(catCount)
    .join("text")
    .attr("class", "bar-count")
    .attr("x", d => {
      // Berechne, wie viele Spalten diese Kategorie braucht:
      const numCols= Math.ceil(d.count/2);
      return barChartX + numCols* hSpacing + 7;
    }) 
    .attr("y", (d, i) => barChartY + i * (barHeight + barSpacing) + barHeight/2 + 3)
    .attr("alignment-baseline", "middle")
    .attr("font-size", svgWidth * 0.030)
    .attr("font-weight", "bold")
    .attr("opacity", 0) 
    .text(d => d.count);

  
//Einfliegen von Labels 
const barDelay = categories.length * 30 + 1800;

labels
  .transition()
  .duration(600)
  .delay((d,i) => barDelay + i * 100)
  .attr("opacity", 1);

counts
  .transition()
  .duration(500)
  .delay(barDelay +  100 + 200)
  .attr("opacity", 1);
}


//Array Positionen rects vertikal zuordnen

function hideBarChart() {
  
  svg.selectAll(".bar-label, .bar-count")
    .transition()
    .delay(1000)   
    .duration(2000) 
    .attr("opacity", 0);

  arrangeRectsVerticallyLeft();

  setTimeout(() => {
    dispatch("phaseEnd");

  }, 2000);

}

function arrangeRectsVerticallyLeft() {


  const total= svg.selectAll(".idee").size();
  const padding= 20;
  const availableHeight = svgHeight - padding * 2;
  const rectSize= 9;
  //vertikeler Abstand zwischen Rects, damit alle reinpassen
  const vSpacing = (availableHeight - rectSize * total) / (total - 1);


 
    svg.selectAll(".idee")
    .transition()
      .duration(2200)
      .delay((d, i) => i * 20)
      .attr('x', padding)
      .attr('y', (d,i) => padding + i * (rectSize + vSpacing))
      .attr("width", rectSize)
      .attr("height", rectSize)

    .transition()
      .delay(500)
      .duration(500)
      .attr("fill", 'rgb(41, 41, 61)');


   

  

}











   
  $: if (phase === 1) {
    drawIdeas(); //0 macht gerade nur Intro.
  }

  $: if (phase === 3) {
     drawIdeengeber(); //Ideengeber tauchen auf
  }

  $: if (phase === 4) {
    ideenToIdeengeber(); // Ideen ordnen sich Ideengebern zu 
  }

  $: if (phase === 5) {
    highligtAverageIdeas(); // Hightlight average nr. of ideas
  }

  $: if (phase === 6) {
    highlightMaxIdeas(); // 38 Ideen hervorheben
  }

  $: if (phase === 7) {
    colorIdeas(); // // Ideen werden eingefärbt
  }

  $: if (phase === 8) {
    ideasToBarChart(); // Ideen fliegen in ihre Kategorie-Bar
  }

  $: if (phase === 9) {
    hideBarChart(); // Bar Chart transformiert zu vertikaler Grid
  }






</script>




<!--<svg bind:this={container} class="svg-container" ></svg>


<style>

    .svg-container {
        width: 100%; 
        height: auto; 
        max-height: 90vh; 
        display: block;
        margin: 0 auto;
    }
</style>
-->


<script>
    import {fly, fade} from "svelte/transition";
    export let text = ""; // Dynamischer Text wird übergeben
    //console.log(" Eingehender Text in Texte.svelte:", text);

    export let top = "15vh";
    export let left = "5vw";
    export let width = "50vw"; // Dynamische Zeilen Breite

</script>

{#key text}
<!--Container absolute p-4 rounded-lg: Padding & Design, max-w-lg: Breitenbegrenzng text-2xl md:text-3xl: Auto Größen, text-primary: nutzt farbe aus config-->
<div class="absolute p-4 rounded-lg" style="top: {top}; left: {left}; width: {width};">

    <!---->
    <p class="story-text text-textcolor" transition:fly="{{y: -10, delay: 500, duration: 1000}}">{@html text }</p>
    <!---svelte transitions werden nur beim einfügen etc angewandt, nicht bei updates! deshalb 
    braucht ich einen key block, weil der bei Änderung des schlüssels den Text neu erzeugt und damit transition ausführt-->
    
</div>
{/key}


<style>
  

    .story-text {
        font-size: clamp(2rem, 3vw, 5rem); /* Dynamische Schriftgröße */
        line-height: 1.3;

    }
</style>

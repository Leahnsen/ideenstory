 <script>
	// @ts-nocheck
	import { onMount } from 'svelte';

	//export let text = '';
	export let annotations = [];
	export let phase = 0;





//kommt nicht bei 1,2, 8, 10, 14, 15 //kommt nur, wenn es sich ändert.
// warum bei 0, 3, 4, 5, 6, 7, 9, 11, 12, 13, 16
  $: currentAnnotation = annotations.filter(a => a.showPhase <= phase);
  //$: console.log(`📘 phase ${phase} →`, annotations.filter(a => a.showPhase <=phase));
  //$: console.log(`📘 phase ${phase} →`, annotations.filter(a => a.showPhase === phase));





</script> 
  
  {#each currentAnnotation as annotation (annotation.stage)}
    <div
      class="absolute bg-gradient-to-r from-smblue/90 via-smpurple/90 to-smblue/90 text-white rounded-3xl shadow-md p-4"
      style="top: {annotation.y}px; left: {annotation.x}px; transform: translateX(-50%);"
    >
      <p lang="de" class="story-text text-center text-textcolor text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-7xl max-w-full break-words hyphens-auto leading-snug">

        {@html annotation.text}
      </p>
    </div>
  {/each}
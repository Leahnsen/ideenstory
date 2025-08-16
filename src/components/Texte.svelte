<script>
	// @ts-nocheck
	import { animate, stagger } from 'motion';
	import { onMount } from 'svelte';
	import { spring } from "motion"
	  import { base } from '$app/paths';


	export let text = '';
	export let top = '15vh';
	export let left = '5vw';
	//export let annotations = [];
	//export let phaseSankey;
	export let image= null; 


	let boxEl;
	let textEl;
	let skewClass;

	const bgOptions = ['-skew-y-3', 'skew-y-3', '-skew-y-6', 'skew-y-6', 'skew-0'];

	// Skew zufällig setzen, wenn Text kommt
	$: if (text) {
		const randomIndex = Math.floor(Math.random() * bgOptions.length);
		skewClass = bgOptions[randomIndex];
	}

	function getSkewTransform(skewClass) {
		switch (skewClass) {
			case 'skew-y-3': return 'skewY(3deg)';
			case 'skew-y-6': return 'skewY(6deg)';
			case '-skew-y-3': return 'skewY(-3deg)';
			case '-skew-y-6': return 'skewY(-6deg)';
			default: return 'skewY(0deg)';
		}
	}

	function getAntiSkewStyle(skewClass) {
		switch (skewClass) {
			case 'skew-y-3': return 'transform: skewY(-3deg);';
			case 'skew-y-6': return 'transform: skewY(-6deg);';
			case '-skew-y-3': return 'transform: skewY(3deg);';
			case '-skew-y-6': return 'transform: skewY(6deg);';
			default: return '';
		}
	}

	onMount(() => {
		const skew = getSkewTransform(skewClass);



	animate(
		boxEl,
		{
			transform: [
				`${skew} translateY(-80px) scale(0.9)`,
				`${skew} translateY(10px) scale(1.03)`,
				`${skew} translateY(0px) scale(1)`
			],
			opacity: [0, 1, 1]
		},
		{
			duration: 1,
			ease: 'back-out'
		}
	);

		animate(
			textEl,
			{ opacity: [0.9, 1]},
			{ delay: 0.4, duration: 0.5, ease: 'back-out' }
		);
	
	// Wenn <dl> vorhanden ist → Liste animieren
	requestAnimationFrame(() => {
			const list = textEl.querySelector('dl');
			const listUi = textEl.querySelector('ul');

			let listGeneral;
			if (list ) {
				listGeneral = list.querySelectorAll('div');
				
			}else if (listUi) {
				listGeneral = listUi.querySelectorAll('ul');
				
			}

			if (listGeneral && listGeneral.length > 0) {
				animate(
					listGeneral,
					{ opacity: [0, 1], x: [-20, 0] },
					{ delay: stagger(0.4), duration: 1.5, easing: 'back-out' }
				);
			}

			
		});

	});

//kommt nicht bei 1,2, 8, 10, 14, 15 //kommt nur, wenn es sich ändert.
// warum bei 0, 3, 4, 5, 6, 7, 9, 11, 12, 13, 16
 // $: currentAnnotation = annotations.filter(a => a.showPhase <= phase);
  //$: console.log(`📘 phase ${phase} →`, annotations.filter(a => a.showPhase <=phase));
  //$: console.log(`📘 phase ${phase} →`, annotations.filter(a => a.showPhase === phase));



  // robust auflösen (unterstützt auch absolute http-URLs)
  const resolve = (p) => p?.startsWith('http')
    ? p
    : `${base}/${p.replace(/^\/+/, '')}`;

</script>

{#key text}
  <div class="w-full flex justify-center px-4">
    <div
      bind:this={boxEl}
      class="absolute bg-gradient-to-r from-smred via-smpurple to-smblue text-white
             rounded-3xl shadow-md p-10 w-full sm:w-4/5 md:w-2/3 lg:w-1/2 xl:w-1/3 max-w-screen-md
             flex flex-col items-center space-y-4"
      style="top: {top}; left: {left};"
    >
      {#if image}
        <img
          src={resolve(image)}
          alt=""
  		class="w-1/2 h-auto object-cover rounded-full"
        />
      {/if}

      <p
        bind:this={textEl}
        lang="de"
        class="story-text text-textcolor text-xl sm:text-xl md:text-xl lg:text-7xl 
               break-words hyphens-auto leading-snug text-center"
        style={getAntiSkewStyle(skewClass)}
      >
        {@html text}
      </p>
    </div>
  </div>
{/key}



 


  


<style>
	.story-text {
		line-height: 1.2;
	}
</style>

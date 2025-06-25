<script>
	// @ts-nocheck
	import { animate, stagger } from 'motion';
	import { onMount } from 'svelte';
	import { spring } from "motion"

	export let text = '';
	export let top = '15vh';
	export let left = '5vw';
	export let annotations = [];
	export let phase = 0;



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


  $: currentAnnotation = annotations.filter(a => a.showPhase <= phase);
  //$: console.log(`📘 phase ${phase} →`, annotations.filter(a => a.showPhase === phase));





</script>

{#key text}
	<div class="w-full flex justify-center px-4">
		<div
			bind:this={boxEl}
			class="absolute bg-gradient-to-r from-smred via-smpurple to-smblue text-white rounded-3xl shadow-md p-14 max-w-screen-md"
			style="top: {top}; left: {left};"
		>
			<p
				bind:this={textEl}
				lang ="de"
				class="story-text text-textcolor break-words hyphens-auto text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-7xl max-w-full break-words leading-snug"
				style={getAntiSkewStyle(skewClass)}
			>
				{@html text}
			</p>
		</div>
	</div>
{/key}


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


<style>
	.story-text {
		line-height: 1.2;
	}
</style>

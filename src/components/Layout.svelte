<script>
	export let title = 'Die Ideenreise 2021-2025';
</script>

<div class="w-screen h-screen flex flex-col items-center justify-center bg-bgblue overflow-hidden">
	<header class="w-full text-center pt-20 pb-10">
		<h1
			class="text-3xl md:text-6xl lg:text-9xl leading-none
                   font-bold bg-gradient-to-r from-smred via-smpurple to-smblue
                   text-transparent bg-clip-text"
		>
			{title}
		</h1>
	</header>

	<main
		class=" flex-grow min-h-0 bg-bg-bgblue w-full flex flex-col items-center justify-center p-4 md:p-8 lg:p-10"
	>
		<slot />
	</main>
</div>

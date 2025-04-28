<script>
    export let title = "Eine Ideenreise 2021-2025";
  </script>
  
  <div class="w-screen h-screen flex flex-col items-center justify-center bg-background">
    <header class="w-full text-center pt-20 pb-10 min-h-[8vh]">
        <h1 class=" text-3xl md:text-6xl lg:text-9xl leading-none font-bold bg-gradient-to-r from-smred via-smpurple to-smblue text-transparent bg-clip-text">{title}</h1>

    </header>
    <main class="bg-background w-full flex-grow flex flex-col items-center justify-center p-4 md:p-8 lg: p-10">
        <!-- Hier kommt der eigentliche Inhalt aus Data Story-->
        <slot></slot>
    </main>

</div>

  
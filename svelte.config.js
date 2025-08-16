
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte'],
  preprocess: [vitePreprocess()],
  vitePlugin: { inspector: true },

  kit: {
    adapter: adapter(),                // <-- static!
    paths: {
      base: dev ? '' : '/ideenstory',  
    },
    prerender: { entries: ['*'] },     // alles als statische Seiten ausgeben
  }
};

export default config;

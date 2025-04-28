import { join } from 'path'

import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin'
/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}', join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')],
	theme: {
		extend: {
			colors: {
				primary: "#4f46e5",  // Indigo
				secondary: "#9333ea", // Violett
				accent: "#14b8a6",   // Türkis
				background: "#f0eeed ", // Hellgrau/braun
				textcolor: "#293133", // Dunkelgrau für Texte
				smred:"#e73e20",
				smblue:"#2b7ab7",
				smgreen:"#1c9741",
				smpurple:"#883582",
				türkis:	"#8dd3c7", // Türkis
				gelb: "#ffffb3", // Hellgelb
				lavendel:"#bebada", // Lavendel
				rot: "#fb8072", // Lachsrot
				hellblau:"#80b1d3", // Hellblau
				orange:"#fdb462", // Orange
				hellgrün:"#b3de69", // Hellgrün
				rosa:"#fccde5", // Rosa
				grau:"#d9d9d9", // Grau
				lila:"#bc80bd", // Lila
				grün:"#ccebc5", // Mintgrün
				gelb: "#ffed6f"  // Sonnengelb


			},
		},
	},
	plugins: [
		forms,
		typography,
		skeleton(),
		
	],
};

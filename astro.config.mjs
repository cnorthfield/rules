import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// The dictionary is served under https://chrisnorthfield.com/rules
// `site` + `base` are the single place to change the deploy location.
export default defineConfig({
  site: 'https://chrisnorthfield.com',
  base: '/rules',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
  },
});

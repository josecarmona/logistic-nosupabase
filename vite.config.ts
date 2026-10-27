import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: true // Escucha en IPv4 (127.0.0.1 y 0.0.0.0) e IPv6 (::1) para permitir localhost y 127.0.0.1
	}
});

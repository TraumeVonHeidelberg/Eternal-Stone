import { defineConfig } from 'vite'
import { resolve } from 'path'
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
	root: '.',
	publicDir: 'public',
	server: {
		open: true,
		proxy: {
			'^/api/.*': {
				target: 'http://localhost:5000',
				changeOrigin: true,
				secure: false,
			},
			'/proxy': { target: 'http://localhost:5000', changeOrigin: true },
		},
	},
	plugins: [
		viteImagemin({
			webp: {
				quality: 100,
			},
		}),
	],
	build: {
		outDir: 'dist',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				eternal: resolve(__dirname, 'eternalstone.html'),
				anicole: resolve(__dirname, 'anicole.html'),
				anilist: resolve(__dirname, 'anime-list.html'),
				aniplayer: resolve(__dirname, 'anime-player.html'),
			},
		},
	},
})

import { defineConfig } from 'vite'
import { resolve } from 'path'
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
	root: '.',
	publicDir: 'public',
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
			},
		},
	},
})

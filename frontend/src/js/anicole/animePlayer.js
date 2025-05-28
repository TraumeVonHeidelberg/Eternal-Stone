import { getQuery } from './utils.js'
import Hls from 'hls.js/dist/hls.min.js'

const video = document.getElementById('video')
const epId = getQuery('id')

console.log('Hls:', Hls)
console.log('Hls.isSupported:', typeof Hls !== 'undefined' ? Hls.isSupported() : 'Hls is undefined')

fetch(`/api/watch?episodeId=${encodeURIComponent(epId)}`)
	.then(r => r.json())
	.then(data => {
		const srcObj = data.sources.find(s => s.isM3U8) || data.sources[0]
		if (!srcObj) throw new Error('No HLS source')
		const stream = `/proxy?url=${encodeURIComponent(srcObj.url)}`

		if (Hls.isSupported()) {
			const hls = new Hls()
			hls.loadSource(stream)
			hls.attachMedia(video)
		} else {
			video.src = stream // Safari
		}

		const eng = data.subtitles.find(s => s.lang === 'English')
		if (eng) {
			const track = document.createElement('track')
			track.kind = 'subtitles'
			track.label = 'ENG'
			track.srclang = 'en'
			track.src = `/proxy?url=${encodeURIComponent(eng.url)}`
			video.appendChild(track)
		}
	})
	.catch(err => {
		console.error(err)
		video.outerHTML = '<p>Nie udało się wczytać odcinka.</p>'
	})

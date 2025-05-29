import { getQuery } from './utils.js'

const animeId = getQuery('id')
const titleEl = document.getElementById('anime-title')
const listEl = document.getElementById('episode-list')

fetch(`/api/anime?id=${encodeURIComponent(animeId)}`)
	.then(r => r.json())
	.then(data => {
		titleEl.textContent = data.title
		data.episodes.forEach(ep => {
			const card = document.createElement('div')
			card.className = 'episode-item'
			card.innerHTML = `
		<p class="episode-number">Episode ${ep.number}</p>
		<h2 class="episode-name">${ep.title || `Odcinek ${ep.number}`}</h2>
		<a class="episode-watch-btn" href="/anime-player.html?id=${encodeURIComponent(ep.id)}">
			<i class="fa-solid fa-play"></i>
			Oglądaj
		</a>
	`
			listEl.appendChild(card)
		})
	})
	.catch(console.error)

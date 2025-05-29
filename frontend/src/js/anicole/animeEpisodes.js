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
			card.className = 'anime-list-card'
			card.innerHTML = `
    <img src="${ep.thumbnail}" alt="Odcinek ${ep.number}" class="anime-list-card-img">
    <h2 class="anime-list-card-title">Odcinek ${ep.number}</h2>
    <a href="/anime-player.html?id=${encodeURIComponent(ep.id)}">▶️ Oglądaj</a>
  `
			listEl.appendChild(card)
		})
	})
	.catch(console.error)

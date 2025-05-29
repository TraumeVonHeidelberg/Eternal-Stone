const container = document.getElementById('anime-list')
const navHeight = document.querySelector('.nav')?.offsetHeight || 0
const tabs = document.querySelectorAll('.nav__list-el[data-category]')
const form = document.querySelector('.nav__form')
const searchInput = form.querySelector('.nav__form-search')

const ENDPOINT = {
	popular: '/api/top-snippet',
	new: '/api/new-snippet',
	search: '/api/search-snippet',
}

let current = localStorage.getItem('category') || 'popular'
const pages = { popular: 1, new: 1, search: 1 }
let loading = false
let endOfData = { popular: false, new: false, search: false }
let query = ''

function buildURL() {
	let url = `${ENDPOINT[current]}?page=${pages[current]}`
	if (current === 'search') url += `&q=${encodeURIComponent(query)}`
	return url
}

function loadPage() {
	if (current === 'games' || loading || endOfData[current]) return
	loading = true
	fetch(buildURL())
		.then(r => r.text())
		.then(html => {
			if (html.trim()) {
				container.insertAdjacentHTML('beforeend', html)
				pages[current]++
			} else {
				endOfData[current] = true
			}
			loading = false
		})
		.catch(() => {
			loading = false
		})
}

function handleScroll() {
	if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 150) {
		loadPage()
	}
}

function resetView() {
	container.innerHTML = ''
	pages[current] = 1
	endOfData[current] = false
	const y = container.getBoundingClientRect().top + window.scrollY - navHeight + 1
	window.scrollTo({ top: y, behavior: 'smooth' })
}

function setActiveTabs() {
	tabs.forEach(el => el.classList.toggle('nav__list-el--active', el.dataset.category === current))
}

function renderGames() {
	const link = document.createElement('a')
	link.href = '/monkeytype.html'
	link.className = 'anime-list-card-link'

	const card = document.createElement('div')
	card.className = 'anime-list-card'
	card.innerHTML = `
    <img
      src="/img/anicole/user-example.webp"
      alt="Monkeytype"
      class="anime-list-card-img"
    >
    <h2 class="anime-list-card-title">Monkeytype</h2>
  `

	link.appendChild(card)
	container.appendChild(link)
}
function switchCategory(cat) {
	if (cat === current) return
	current = cat
	localStorage.setItem('category', cat)
	query = ''
	setActiveTabs()
	resetView()
	if (cat === 'games') {
		renderGames()
	} else {
		loadPage()
	}
}

tabs.forEach(el => el.addEventListener('click', () => switchCategory(el.dataset.category)))

form.addEventListener('submit', e => {
	e.preventDefault()
	const q = searchInput.value.trim()
	if (!q) return
	query = q
	current = 'search'
	localStorage.setItem('category', current)
	setActiveTabs()
	resetView()
	loadPage()
})

window.addEventListener('scroll', handleScroll)

document.addEventListener('DOMContentLoaded', () => {
	setActiveTabs()
	if (current === 'games') {
		resetView()
		renderGames()
	} else {
		loadPage()
	}
})

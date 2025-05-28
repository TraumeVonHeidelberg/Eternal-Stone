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
	if (loading || endOfData[current]) return
	loading = true
	const url = buildURL()
	console.log('[Anime] fetch URL:', url)
	console.log('[Anime] page:', pages[current])
	fetch(url)
		.then(r => {
			console.log('[Anime] response status:', r.status)
			return r.text()
		})
		.then(html => {
			if (html.trim()) {
				container.insertAdjacentHTML('beforeend', html)
				pages[current]++
			} else {
				endOfData[current] = true
				console.log('[Anime] endOfData reached for', current)
			}
			loading = false
		})
		.catch(err => {
			console.error('[Anime] fetch error:', err)
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

function switchCategory(cat) {
	if (cat === current) return
	current = cat
	localStorage.setItem('category', cat)
	console.log('[Anime] switchCategory:', current)
	query = ''
	setActiveTabs()
	resetView()
	loadPage()
}

tabs.forEach(el => el.addEventListener('click', () => switchCategory(el.dataset.category)))

form.addEventListener('submit', e => {
	e.preventDefault()
	const q = searchInput.value.trim()
	if (!q) return
	query = q
	current = 'search'
	console.log('[Anime] search query:', query)
	setActiveTabs()
	resetView()
	loadPage()
})

window.addEventListener('scroll', handleScroll)

document.addEventListener('DOMContentLoaded', () => {
	setActiveTabs()
	loadPage()
})

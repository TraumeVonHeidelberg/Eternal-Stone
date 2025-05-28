const container = document.getElementById('anime-list') // sekcja, w której rysujemy
if (!container) console.warn('Brak #anime-popular na tej stronie')

const ENDPOINT = {
	// mapowanie kategorii → endpoint Flaska
	popular: '/api/top-snippet',
	new: '/api/new-snippet',
}

let current = 'popular' // co aktualnie pokazujemy
const pages = { popular: 1, new: 1 } // osobny licznik stron
let loading = false // blokada podwójnego fetchu
let endOfData = { popular: false, new: false } // czy API zwróciło pustą stronę?

function loadPage() {
	if (loading || endOfData[current] || !container) return
	loading = true

	fetch(`${ENDPOINT[current]}?page=${pages[current]}`)
		.then(r => r.text())
		.then(html => {
			if (html.trim()) {
				container.insertAdjacentHTML('beforeend', html)
				pages[current]++ // przygotuj kolejną stronę
			} else {
				endOfData[current] = true // brak kolejnych danych
			}
			loading = false
		})
		.catch(err => {
			console.error(`Błąd ładowania ${current}:`, err)
			loading = false
		})
}

function handleScroll() {
	const bottom = window.innerHeight + window.scrollY
	if (bottom >= document.body.offsetHeight - 150) loadPage()
}

function switchCategory(cat) {
	if (cat === current) return // klik na aktywną zakładkę → nic

	current = cat

	// 1) zmień wyróżnienie w menu
	document
		.querySelectorAll('.nav__link[data-category]')
		.forEach(a => a.classList.toggle('nav__link--active', a.dataset.category === cat))

	// 2) wyczyść ekran i przewiń do góry
	container.innerHTML = ''
	window.scrollTo({ top: 0, behavior: 'instant' })

	// 3) zresetuj licznik i flagę końca danych
	pages[cat] = 1
	endOfData[cat] = false

	// 4) pobierz pierwszą stronę nowej kategorii
	loadPage()
}

document.addEventListener('DOMContentLoaded', () => {
	// podpinamy kliknięcia w navbarze (delegacja po data-category)
	document.querySelectorAll('.nav__link[data-category]').forEach(link =>
		link.addEventListener('click', e => {
			e.preventDefault()
			switchCategory(link.dataset.category)
		})
	)

	// inicjalne dane + scroll
	loadPage()
	window.addEventListener('scroll', handleScroll)
})

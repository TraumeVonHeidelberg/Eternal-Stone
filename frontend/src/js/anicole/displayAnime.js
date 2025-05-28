let page = 1 // aktualnie pobrana strona
let loading = false // blokada wielokrotnego fetch
const box = document.getElementById('anime-popular')
if (!box) console.warn('Brak #anime-popular na tej stronie')

function loadPage() {
	if (!box || loading) return
	loading = true

	fetch(`/api/top-snippet?page=${page}`)
		.then(res => res.text())
		.then(html => {
			if (html.trim()) {
				box.insertAdjacentHTML('beforeend', html)
				page++ // przygotuj się na następną partię
				loading = false
			} else {
				// brak kolejnych danych – odpinamy scroll
				window.removeEventListener('scroll', handleScroll)
			}
		})
		.catch(err => {
			console.error('Błąd ładowania top-snippet:', err)
			loading = false
		})
}

function handleScroll() {
	const bottom = window.innerHeight + window.scrollY
	if (bottom >= document.body.offsetHeight - 150) {
		loadPage() // jesteśmy 150 px od końca – doładuj
	}
}

document.addEventListener('DOMContentLoaded', () => {
	loadPage() // 1. strona od razu
	window.addEventListener('scroll', handleScroll)
})

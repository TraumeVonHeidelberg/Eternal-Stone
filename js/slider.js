const slides = [
	{
		title: 'Nagłówek 1',
		description: 'Tekst informacyjny 1',
		image: '../img/slider/EternalStone.png',
	},
	{
		title: 'Nagłówek 2',
		description: 'Tekst informacyjny 2',
		image: '../img/slider/VisualNovel.png',
	},
	{
		title: 'Nagłówek 3',
		description: 'Tekst informacyjny 3',
		image: '../img/slider/AnimeRPG.png',
	},
]

const listElement = document.querySelector('.works__list')
const sliderContainer = document.querySelector('.works__slider')

const today = new Date()
let currentSlide = today.getMonth() === 1 ? today.getDate() - 1 : 0
let activeIndex = currentSlide

const rotationPerSlide = -360 / slides.length

initializeSlider()

function initializeSlider() {
	slides.forEach((slide, index) => {
		const li = document.createElement('li')
		li.classList.add('works__list-element')
		li.style.setProperty('--slideIndex', index)
		li.style.backgroundImage = `url(${slide.image})`

		if (index === 1) {
			li.classList.add('works__list-element--centered')
		}

		const a = document.createElement('a')
		a.href = `/podstrona-${index + 1}`
		a.classList.add('works__list-link')

		const h2 = document.createElement('h2')
		h2.classList.add('works__list-header')
		h2.textContent = slide.title

		const span = document.createElement('span')
		span.classList.add('works__list-text')
		span.textContent = slide.description

		a.appendChild(h2)
		a.appendChild(span)
		li.appendChild(a)
		listElement.appendChild(li)
	})

	listElement.style.setProperty('--rotateAngle', rotationPerSlide)
	updateActiveSlide(0)

	sliderContainer.addEventListener('wheel', e => {
		e.preventDefault()
		updateActiveSlide(e.deltaY < 0 ? -1 : 1)
	})
}

function updateActiveSlide(offset) {
	currentSlide += offset
	listElement.style.setProperty('--currentSlide', currentSlide)

	const prevActive = document.querySelector('.works__list-element.active')
	if (prevActive) prevActive.classList.remove('active')

	activeIndex = (activeIndex + offset + slides.length) % slides.length
	const currentElement = document.querySelector(`.works__list-element:nth-child(${activeIndex + 1})`)

	document.body.style.backgroundColor = window.getComputedStyle(currentElement).backgroundColor
	currentElement.classList.add('active')
}

const slides = [
	{
		title: 'Eternal Stone',
		description: 'MMO-RPG Project',
		image: '../img/slider/EternalStone.png',
		bgImage: 'url("../img/slider/EternalStone-large.png")',
	},
	{
		title: 'Coming Soon',
		description: 'Visual Novel Project',
		image: '../img/slider/VisualNovel.png',
		bgImage: 'url("../img/slider/VisualNovel-large.png")',
	},
	{
		title: 'Coming Soon',
		description: 'Anime RPG project',
		image: '../img/slider/AnimeRPG.png',
		bgImage: 'url("../img/slider/AnimeRPG--large.png")',
	},
]

const listElement = document.querySelector('.works__list')
const sliderContainer = document.querySelector('.works__slider')
const bgCurrent = document.querySelector('.works__bg-layer--current')
const bgNext = document.querySelector('.works__bg-layer--next')
const nav = document.querySelector('.nav')
const musicBox = document.querySelector('.header__music-box')

let currentSlide = 0
let activeIndex = 0
let isHover = false
const rotationPerSlide = -360 / slides.length
let currentTransitionEndCallback = null

initializeSlider()

function initializeSlider() {
	slides.forEach((slide, index) => {
		const li = document.createElement('li')
		li.classList.add('works__list-element')
		li.style.setProperty('--slideIndex', index)
		li.style.backgroundImage = `url(${slide.image})`

		const a = document.createElement('a')
		a.href = `/podstrona-${index + 1}`
		a.classList.add('works__list-link')
		if (index === 1 || index === 2) {
			a.removeAttribute('href')
			a.style.pointerEvents = 'none'
			a.style.cursor = 'default'
		}

		const h2 = document.createElement('h2')
		h2.classList.add('works__list-header')
		h2.textContent = slide.title

		const span = document.createElement('span')
		span.classList.add('works__list-text')
		span.setAttribute('data-fulltext', slide.description)
		span.textContent = ''

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

	sliderContainer.addEventListener('mouseenter', () => {
		isHover = true
		nav.classList.add('hidden')
		musicBox.classList.add('hidden')
		crossFadeBackground(activeIndex)
	})

	sliderContainer.addEventListener('mouseleave', () => {
		isHover = false
		fadeToBlack()
		nav.classList.remove('hidden')
		musicBox.classList.remove('hidden')
	})
}

function updateActiveSlide(offset) {
	currentSlide += offset
	listElement.style.setProperty('--currentSlide', currentSlide)
	const prevActive = document.querySelector('.works__list-element.active')
	if (prevActive) {
		const prevSpan = prevActive.querySelector('.works__list-text')
		if (prevSpan) {
			prevSpan.textContent = ''
		}
		prevActive.classList.remove('active')
	}
	activeIndex = (activeIndex + offset + slides.length) % slides.length
	const currentElement = document.querySelector(`.works__list-element:nth-child(${activeIndex + 1})`)
	currentElement.classList.add('active')
	const span = currentElement.querySelector('.works__list-text')
	if (span) {
		typeText(span, 30)
	}
	if (isHover) {
		crossFadeBackground(activeIndex)
	} else {
		fadeToBlack()
	}
}

function typeText(span, speed) {
	const fullText = span.getAttribute('data-fulltext') || ''
	span.textContent = ''
	let i = 0
	const timer = setInterval(() => {
		span.textContent += fullText[i]
		i++
		if (i >= fullText.length) {
			clearInterval(timer)
		}
	}, speed)
}

function stopAllTransitions() {
	if (currentTransitionEndCallback) {
		bgNext.removeEventListener('transitionend', currentTransitionEndCallback)
		currentTransitionEndCallback = null
	}
	bgCurrent.style.transition = 'none'
	bgNext.style.transition = 'none'
	bgCurrent.style.opacity = 1
	bgNext.style.opacity = 0
	bgNext.getBoundingClientRect()
	bgCurrent.getBoundingClientRect()
	bgCurrent.style.transition = ''
	bgNext.style.transition = ''
}

function preloadBackgroundImage(bgUrl) {
	return new Promise(resolve => {
		const match = bgUrl.match(/url\(["']?(.*?)["']?\)/)
		const src = match ? match[1] : bgUrl
		const img = new Image()
		img.src = src
		if (img.complete) {
			resolve()
		} else {
			img.onload = () => resolve()
			img.onerror = () => resolve()
		}
	})
}

async function crossFadeBackground(newIndex) {
	stopAllTransitions()
	await preloadBackgroundImage(slides[newIndex].bgImage)
	bgNext.style.backgroundImage = slides[newIndex].bgImage
	bgNext.style.backgroundColor = ''
	bgNext.style.opacity = 1
	const handleTransitionEnd = () => {
		bgNext.removeEventListener('transitionend', handleTransitionEnd)
		currentTransitionEndCallback = null
		bgCurrent.style.backgroundImage = slides[newIndex].bgImage
		bgCurrent.style.backgroundColor = ''
		bgCurrent.style.opacity = 1
		bgNext.style.opacity = 0
	}
	currentTransitionEndCallback = handleTransitionEnd
	bgNext.addEventListener('transitionend', handleTransitionEnd)
}

function fadeToBlack() {
	stopAllTransitions()
	bgNext.style.backgroundImage = 'none'
	bgNext.style.backgroundColor = 'black'
	bgNext.style.opacity = 1
	const handleTransitionEnd = () => {
		bgNext.removeEventListener('transitionend', handleTransitionEnd)
		currentTransitionEndCallback = null
		bgCurrent.style.backgroundImage = 'none'
		bgCurrent.style.backgroundColor = 'black'
		bgCurrent.style.opacity = 1
		bgNext.style.opacity = 0
	}
	currentTransitionEndCallback = handleTransitionEnd
	bgNext.addEventListener('transitionend', handleTransitionEnd)
}

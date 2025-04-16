const slides = [
	{
		title: 'Eternal Stone',
		description: 'MMO-RPG Project',
		image: '../img/slider/EternalStone.png',
		bgImage: 'url("../img/slider/EternalStone-large.png")',
		videoSrc: '../img/slider/Eternal Stone.mp4',
	},
	{
		title: 'Coming Soon',
		description: 'Visual Novel Project',
		image: '../img/slider/VisualNovel.png',
		bgImage: 'url("../img/slider/VisualNovel-large.png")',
		videoSrc: '../img/slider/Visual Novel.mp4',
	},
	{
		title: 'Coming Soon',
		description: 'Anime RPG project',
		image: '../img/slider/AnimeRPG.png',
		bgImage: 'url("../img/slider/AnimeRPG--large.png")',
		videoSrc: '../img/slider/Anime RPG.mp4',
	},
]

const listElement = document.querySelector('.works__list')
const sliderContainer = document.querySelector('.works__slider')
const layerCurrent = document.querySelector('.works__bg-layer--current')
const layerNext = document.querySelector('.works__bg-layer--next')
const videoCurrent = layerCurrent.querySelector('.works__video--current')
const videoNext = layerNext.querySelector('.works__video--next')
const nav = document.querySelector('.nav')
const musicBox = document.querySelector('.header__music-box')

videoCurrent.muted = true
videoNext.muted = true
videoCurrent.setAttribute('playsinline', '')
videoNext.setAttribute('playsinline', '')

let currentSlide = 0
let activeIndex = 0
let isHover = false
const rotationPerSlide = -360 / slides.length
let currentTransitionEndCallback = null

function getModifierClass(index) {
	const ordinals = [
		'--first',
		'--second',
		'--third',
		'--fourth',
		'--fifth',
		'--sixth',
		'--seventh',
		'--eighth',
		'--ninth',
		'--tenth',
	]
	return ordinals[index] || `--${index + 1}`
}

function updateVideoModifier(videoElement, slideIndex) {
	const ordinals = [
		'--first',
		'--second',
		'--third',
		'--fourth',
		'--fifth',
		'--sixth',
		'--seventh',
		'--eighth',
		'--ninth',
		'--tenth',
	]
	const modifier = ordinals[slideIndex] || `--${slideIndex + 1}`
	const possibleModifiers = ordinals.slice(0, slides.length)
	possibleModifiers.forEach(mod => {
		videoElement.classList.remove(`works__video${mod}`)
	})
	videoElement.classList.add(`works__video${modifier}`)
}

initializeSlider()

function initializeSlider() {
	slides.forEach((slide, index) => {
		const li = document.createElement('li')
		li.classList.add('works__list-element')
		li.classList.add(`works__list-element${getModifierClass(index)}`)
		li.style.setProperty('--slideIndex', index)
		li.style.backgroundImage = `url(${slide.image})`

		const a = document.createElement('a')
		a.rel = 'noopener'

		if (index === 0) {
			a.href = 'eternalstone.html'
		} else {
			a.href = `/link-${index + 1}`
		}

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
		e.stopPropagation()
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

	let touchStartY = 0
	let touchEndY = 0
	const threshold = 30

	sliderContainer.addEventListener('touchstart', e => {
		if (e.changedTouches.length) {
			touchStartY = e.changedTouches[0].clientY
		}
	})

	sliderContainer.addEventListener('touchend', e => {
		if (e.changedTouches.length) {
			touchEndY = e.changedTouches[0].clientY
			if (touchStartY - touchEndY > threshold) {
				updateActiveSlide(1)
			} else if (touchEndY - touchStartY > threshold) {
				updateActiveSlide(-1)
			}
		}
	})
}

function updateActiveSlide(offset) {
	currentSlide += offset
	listElement.style.setProperty('--currentSlide', currentSlide)

	const prevActive = document.querySelector('.works__list-element.active')
	if (prevActive) {
		const prevSpan = prevActive.querySelector('.works__list-text')
		if (prevSpan) {
			if (prevSpan.dataset.timeoutId) {
				clearTimeout(parseInt(prevSpan.dataset.timeoutId))
				prevSpan.dataset.timeoutId = ''
			}
			if (prevSpan.dataset.timerId) {
				clearInterval(parseInt(prevSpan.dataset.timerId))
				prevSpan.dataset.timerId = ''
			}
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

function typeText(span, speed = 30, delay = 300) {
	const fullText = span.getAttribute('data-fulltext') || ''

	if (span.dataset.timeoutId) {
		clearTimeout(parseInt(span.dataset.timeoutId))
		span.dataset.timeoutId = ''
	}
	if (span.dataset.timerId) {
		clearInterval(parseInt(span.dataset.timerId))
		span.dataset.timerId = ''
	}
	span.textContent = ''

	const timeoutId = setTimeout(() => {
		let i = 0
		const timerId = setInterval(() => {
			span.textContent += fullText[i]
			i++
			if (i >= fullText.length) {
				clearInterval(timerId)
				span.dataset.timerId = ''
			}
		}, speed)
		span.dataset.timerId = timerId.toString()
	}, delay)
	span.dataset.timeoutId = timeoutId.toString()
}

function stopAllTransitions() {
	if (currentTransitionEndCallback) {
		layerNext.removeEventListener('transitionend', currentTransitionEndCallback)
		currentTransitionEndCallback = null
	}
	layerCurrent.style.transition = 'none'
	layerNext.style.transition = 'none'
	layerCurrent.style.opacity = 1
	layerNext.style.opacity = 0
	layerNext.getBoundingClientRect()
	layerCurrent.getBoundingClientRect()
	layerCurrent.style.transition = ''
	layerNext.style.transition = ''
}

function waitForCanPlay(video) {
	return new Promise(resolve => {
		if (video.readyState >= 3) {
			resolve()
		} else {
			const canPlayHandler = () => {
				video.removeEventListener('canplay', canPlayHandler)
				resolve()
			}
			video.addEventListener('canplay', canPlayHandler)
		}
	})
}

async function crossFadeBackground(newIndex) {
	stopAllTransitions()

	videoCurrent.pause()
	videoCurrent.src = ''

	videoNext.pause()
	videoNext.src = slides[newIndex].videoSrc || ''
	videoNext.currentTime = 0

	updateVideoModifier(videoNext, newIndex)

	await waitForCanPlay(videoNext)
	videoNext.play()
	layerNext.style.opacity = 1

	const handleTransitionEnd = () => {
		layerNext.removeEventListener('transitionend', handleTransitionEnd)
		currentTransitionEndCallback = null

		videoCurrent.src = videoNext.src
		videoCurrent.currentTime = videoNext.currentTime
		videoCurrent.play()
		updateVideoModifier(videoCurrent, newIndex)

		layerCurrent.style.opacity = 1
		layerNext.style.opacity = 0
	}

	currentTransitionEndCallback = handleTransitionEnd
	layerNext.addEventListener('transitionend', handleTransitionEnd)
}

function fadeToBlack() {
	stopAllTransitions()
	videoNext.pause()
	videoNext.src = ''
	videoNext.load()
	layerNext.style.backgroundColor = 'black'
	layerNext.style.opacity = 1

	const handleTransitionEnd = () => {
		layerNext.removeEventListener('transitionend', handleTransitionEnd)
		currentTransitionEndCallback = null

		videoCurrent.pause()
		videoCurrent.src = ''
		videoCurrent.load()
		layerCurrent.style.backgroundColor = 'black'
		layerCurrent.style.opacity = 1
		layerNext.style.opacity = 0
	}
	currentTransitionEndCallback = handleTransitionEnd
	layerNext.addEventListener('transitionend', handleTransitionEnd)
}

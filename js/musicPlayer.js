document.addEventListener('DOMContentLoaded', () => {
	const audio = document.getElementById('myAudio')
	const playPauseIcon = document.getElementById('playPauseIcon')
	const playPauseShape = document.getElementById('playPauseShape')
	const morphAnim = document.getElementById('morphAnim')
	const [leftArrow, rightArrow] = document.querySelectorAll('.header__music-arrow')

	let isPlaying = false
	let currentTrackIndex = 0

	const iconPaths = {
		play: 'M30,20 L70,50 L30,80 L30,80 Z M30,20 L30,20 L30,20 L30,20 Z',
		pause: 'M30,20 L40,20 L40,80 L30,80 Z M60,20 L70,20 L70,80 L60,80 Z',
	}

	const playlist = [
		{ title: 'Love 2000', src: './audio/Love 2000.mp3' },
		{ title: 'Coraz bliżej śmierci', src: './audio/SLASHEC.mp3' },
	]

	function animateIcon(fromPath, toPath) {
		morphAnim.setAttribute('from', fromPath)
		morphAnim.setAttribute('to', toPath)
		morphAnim.beginElement()
	}

	function loadTrack(index) {
		audio.src = playlist[index].src

		const rawTitle = playlist[index].title
		const separator = ' ● '
		const repeatedTitle = (separator + rawTitle).repeat(10).trim()

		const marqueeText = document.getElementById('marqueeText')
		marqueeText.textContent = repeatedTitle

		requestAnimationFrame(() => {
			const container = marqueeText.parentElement
			const textWidth = marqueeText.scrollWidth
			const containerWidth = container.offsetWidth

			const distance = textWidth + containerWidth
			const speed = 200 
			const duration = distance / speed

			marqueeText.style.animation = `scroll-left ${duration}s linear infinite`
		})
	}

	playPauseIcon.addEventListener('click', () => {
		if (isPlaying) {
			audio.pause()
			animateIcon(iconPaths.pause, iconPaths.play)
		} else {
			audio.play()
			animateIcon(iconPaths.play, iconPaths.pause)
		}
		isPlaying = !isPlaying
	})

	leftArrow.addEventListener('click', () => {
		currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length
		loadTrack(currentTrackIndex)
		audio.play()
		isPlaying = true
		animateIcon(iconPaths.play, iconPaths.pause)
	})

	rightArrow.addEventListener('click', () => {
		currentTrackIndex = (currentTrackIndex + 1) % playlist.length
		loadTrack(currentTrackIndex)
		audio.play()
		isPlaying = true
		animateIcon(iconPaths.play, iconPaths.pause)
	})

	audio.addEventListener('ended', () => {
		currentTrackIndex = (currentTrackIndex + 1) % playlist.length
		loadTrack(currentTrackIndex)
		audio.play() 
	})

	playPauseShape.setAttribute('d', iconPaths.play)
	loadTrack(currentTrackIndex)

	const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
	const analyser = audioCtx.createAnalyser()
	analyser.fftSize = 8192 
	const dataArray = new Uint8Array(analyser.frequencyBinCount) 

	const source = audioCtx.createMediaElementSource(audio)
	source.connect(analyser)
	analyser.connect(audioCtx.destination)

	audio.addEventListener('play', () => {
		if (audioCtx.state === 'suspended') {
			audioCtx.resume()
		}

		smoothedData.fill(0)
		const baseHue = Math.floor(Math.random() * 360) // 0–359

		const saturation = 80
		const lightTop = 60
		const lightBottom = 25

		gradientTop = `hsl(${baseHue}, ${saturation}%, ${lightTop}%)`
		gradientBottom = `hsl(${baseHue}, ${saturation}%, ${lightBottom}%)`
	})

	function constrain(val, min, max) {
		return Math.min(Math.max(val, min), max)
	}
	function mapRange(value, inMin, inMax, outMin, outMax) {
		return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
	}

	const $canvas = document.getElementById('header__music-waves')
	const ctx = $canvas.getContext('2d')

	let barScale = 5 
	let smoothedData = new Float32Array(dataArray.length) 

	function resize() {
		const { width: w, height: h } = $canvas.parentNode.getBoundingClientRect()
		$canvas.width = w
		$canvas.height = h

		const n = constrain(window.innerWidth, 375, 1400)
		barScale = parseInt(mapRange(n, 375, 1400, 20, 5), 10)
	}

	resize()
	window.addEventListener('resize', resize)


	let gradientTop = 'rgba(139, 92, 246, 0.7)'
	let gradientBottom = 'rgba(139, 92, 246, 0.1)'

	function update() {
		analyser.getByteFrequencyData(dataArray)

		ctx.clearRect(0, 0, $canvas.width, $canvas.height)

		const length = dataArray.length 
		const barWidth = ($canvas.width / length) * barScale
		const barsCount = length / barScale // np. 4096/5 = 819
		const smoothingSpeed = 0.15 // im mniejsze, tym wolniej opada

		let r = 0
		for (let s = 0; s < barsCount; s++) {
			const rawNorm = dataArray[s] / 255
			const target = isPlaying ? rawNorm : 0
			smoothedData[s] = smoothedData[s] * (1 - smoothingSpeed) + target * smoothingSpeed

			const barHeight = smoothedData[s] * $canvas.height

			// Gradient oparty na smoothedData[s]
			const gradient = ctx.createLinearGradient(r, $canvas.height - barHeight, r, $canvas.height)
			gradient.addColorStop(0, gradientTop)
			gradient.addColorStop(1, gradientBottom)
			ctx.fillStyle = gradient

			ctx.fillRect(r, $canvas.height - barHeight, barWidth, barHeight)

			r += barWidth
		}
	}

	function animate() {
		requestAnimationFrame(animate)
		update()
	}
	animate()
})

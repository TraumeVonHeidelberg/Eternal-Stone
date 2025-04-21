document.addEventListener('DOMContentLoaded', () => {
	const videoEl = document.getElementById('header-video')
	const audioEl = document.getElementById('background-music')
	const muteBtn = document.getElementById('mute-btn')
	const iconMuted = document.getElementById('icon-muted')
	const iconUnmuted = document.getElementById('icon-unmuted')
	const hour = new Date().getHours()

	let videoFile, audioFile
	if (hour >= 6 && hour < 12) {
		videoFile = '../../img/eternal backgrounds/morning.mp4'
		audioFile = '../../audio/morning.mp3'
	} else if (hour >= 12 && hour < 18) {
		videoFile = '../../img/eternal backgrounds/afternoon.mp4'
		audioFile = '../../audio/afternoon.mp3'
	} else {
		videoFile = '../../img/eternal backgrounds/night.mp4'
		audioFile = '../../audio/night.mp3'
	}

	function updateMedia(el, file) {
		if (el.src && el.src.includes(file)) return
		el.src = file
		el.load()
		el.play().catch(() => {})
	}

	audioEl.muted = true

	updateMedia(videoEl, videoFile)
	updateMedia(audioEl, audioFile)

	iconMuted.classList.remove('hidden')
	iconUnmuted.classList.add('hidden')

	muteBtn.addEventListener('click', () => {
		audioEl.muted = !audioEl.muted
		iconMuted.classList.toggle('hidden')
		iconUnmuted.classList.toggle('hidden')
	})
})

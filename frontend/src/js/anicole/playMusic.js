window.addEventListener('DOMContentLoaded', () => {
	const audio = document.getElementById('bg-music')
	audio.volume = 0.01 
	audio
		.play()
		.then(() => {
			fadeIn(audio, 0.3) 
		})
})

function fadeIn(audioElement, targetVolume) {
	const step = 0.01
	const interval = 100

	const fade = setInterval(() => {
		if (audioElement.volume < targetVolume) {
			audioElement.volume = Math.min(targetVolume, audioElement.volume + step)
		} else {
			clearInterval(fade)
		}
	}, interval)
}

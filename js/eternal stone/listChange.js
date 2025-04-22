document.addEventListener('DOMContentLoaded', () => {
	const items = Array.from(document.querySelectorAll('.header__list-element'))
	const sound = document.getElementById('list-sound')
	let currentIndex = -1 // brak aktywnego na starcie

	function updateActive(index) {
		if (index === currentIndex) return
		const prevIndex = currentIndex
		currentIndex = index
		items.forEach((li, i) => li.classList.toggle('active', i === index))
        
		if (prevIndex !== -1) {
			sound.currentTime = 0
			sound.play().catch(() => {})
		}
	}

	function activate(li) {
		const a = li.querySelector('a')
		if (a) window.location.href = a.href
		else console.log('Wybrano:', li.textContent.trim())
	}

	updateActive(0)

	items.forEach((li, idx) => {
		li.addEventListener('mouseenter', () => updateActive(idx))
		li.addEventListener('click', () => activate(li))
	})

	document.addEventListener('keydown', e => {
		let newIndex
		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
				e.preventDefault()
				newIndex = (currentIndex + 1) % items.length
				updateActive(newIndex)
				break
			case 'ArrowLeft':
			case 'ArrowUp':
				e.preventDefault()
				newIndex = (currentIndex - 1 + items.length) % items.length
				updateActive(newIndex)
				break
			case 'Enter':
				activate(items[currentIndex])
				break
		}
	})
})

document.addEventListener('DOMContentLoaded', () => {
	const items = Array.from(document.querySelectorAll('.header__list-element'))
	const sections = Array.from(document.querySelectorAll('.section'))
	const navSound = document.getElementById('list-sound')
	const openSound = document.getElementById('eternal-section-open')
	const closeSound = document.getElementById('eternal-section-close')
	let currentIndex = -1
	let lastSectionIndex = -1

	function updateActive(i) {
		if (i === currentIndex) return
		const prev = currentIndex
		currentIndex = i
		items.forEach((li, idx) => li.classList.toggle('active', idx === i))
		if (prev !== -1) {
			navSound.currentTime = 0
			navSound.play().catch(() => {})
		}
	}

	function activate(i) {
		if (i < sections.length) {
			if (lastSectionIndex !== -1 && lastSectionIndex !== i) {
				closeSound.currentTime = 0
				closeSound.play().catch(() => {})
			}
			if (lastSectionIndex !== i) {
				openSound.currentTime = 0
				openSound.play().catch(() => {})
			}
			sections.forEach((sec, idx) => sec.classList.toggle('hidden', idx !== i))
			lastSectionIndex = i
		} else {
			if (lastSectionIndex !== -1) {
				closeSound.currentTime = 0
				closeSound.play().catch(() => {})
				lastSectionIndex = -1
			}
			const a = items[i].querySelector('a')
			if (a) window.location.href = a.href
		}
	}

	function closeAll() {
		if (lastSectionIndex !== -1) {
			closeSound.currentTime = 0
			closeSound.play().catch(() => {})
			sections.forEach(sec => sec.classList.add('hidden'))
			lastSectionIndex = -1
		}
	}

	updateActive(0)

	items.forEach((li, idx) => {
		li.addEventListener('mouseenter', () => updateActive(idx))
		li.addEventListener('click', () => {
			updateActive(idx)
			activate(idx)
		})
	})

	document.addEventListener('keydown', e => {
		let next
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault()
			next = (currentIndex + 1) % items.length
			updateActive(next)
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault()
			next = (currentIndex - 1 + items.length) % items.length
			updateActive(next)
		} else if (e.key === 'Enter') {
			activate(currentIndex)
		} else if (e.key === 'Escape' || e.key.toLowerCase() === 'q') {
			closeAll()
		}
	})
})

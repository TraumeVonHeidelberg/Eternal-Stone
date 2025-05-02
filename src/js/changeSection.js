document.addEventListener('DOMContentLoaded', function () {
	const header = document.querySelector('header')
	const worksSection = document.querySelector('section.works')
	const sections = [header, worksSection]

	let currentSectionIndex = 0
	let scrolling = false

	function scrollToSection(index) {
		if (index < 0 || index >= sections.length) return

		scrolling = true
		sections[index].scrollIntoView({ behavior: 'smooth' })
		currentSectionIndex = index

		setTimeout(() => {
			scrolling = false
		}, 1000)
	}

	window.addEventListener(
		'wheel',
		function (e) {
			if (scrolling) {
				e.preventDefault()
				return
			}

			if (e.deltaY > 0) {
				if (currentSectionIndex < sections.length - 1) {
					e.preventDefault()
					scrollToSection(currentSectionIndex + 1)
				}
			} else if (e.deltaY < 0) {
				if (currentSectionIndex > 0) {
					e.preventDefault()
					scrollToSection(currentSectionIndex - 1)
				}
			}
		},
		{ passive: false }
	)
})

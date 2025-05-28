const images = document.querySelectorAll('.invert-color')
const worksSection = document.querySelector('.works')
const headerSection = document.querySelector('.header')

function isOverlapping(el1, el2) {
	const rect1 = el1.getBoundingClientRect()
	const rect2 = el2.getBoundingClientRect()

	return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom || rect1.right < rect2.left || rect1.left > rect2.right)
}

function checkAllOverlaps() {
	images.forEach(img => {
		if (isOverlapping(img, worksSection)) {
			img.classList.add('white')
		} else {
			img.classList.remove('white')
		}
	})
}

window.addEventListener('scroll', checkAllOverlaps)
window.addEventListener('resize', checkAllOverlaps)

checkAllOverlaps()

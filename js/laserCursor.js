const canvas = document.getElementById('laserCursor')
const ctx = canvas.getContext('2d')
const baseColor = '#8B5CF6'
const hoverColor = 'rgba(0,0,0,0)' // laser przy interakcji przybiera czerwony kolor

canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
})

// Pozycja kursora i ślad (trail)
const cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
const trail = []
const maxTrailLength = 30

// Właściwości kółka (lasera)
let targetRadius = 4
let currentRadius = 4
let cursorColor = baseColor
let isHoveringInteractive = false

// Nakładka do inwersji kolorów
const inversionOverlay = document.getElementById('inversionOverlay')

document.addEventListener('mousemove', event => {
	cursor.x = event.clientX
	cursor.y = event.clientY

	// Aktualizacja śladu kursora
	trail.push({ x: cursor.x, y: cursor.y })
	if (trail.length > maxTrailLength) trail.shift()

	// Wykrywanie interaktywnego elementu
	let el = document.elementFromPoint(event.clientX, event.clientY)
	isHoveringInteractive = false
	if (el) {
		const interactiveEl = el.closest(
			'a, button, input, select, textarea, [onclick], .interactive, [role="button"],[data-interactive]'
		)
		if (interactiveEl) {
			isHoveringInteractive = true
		}
	}

	// Ustawiamy kształt inwersji – wykorzystujemy ten sam promień, co laserowe kółko (targetRadius)
	// Jeśli nie jesteśmy nad interaktywnym elementem, nakładka jest niewidoczna (promień 0, opacity 0)
	if (isHoveringInteractive) {
		inversionOverlay.style.opacity = '1'
		inversionOverlay.style.clipPath = `circle(${targetRadius}px at ${event.clientX}px ${event.clientY}px)`
	} else {
		inversionOverlay.style.opacity = '0'
		inversionOverlay.style.clipPath = `circle(0px at ${event.clientX}px ${event.clientY}px)`
	}
})

function animate() {
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// Rysujemy laserowy ślad (trail) tylko, gdy kursor nie jest nad interaktywnym elementem
	if (!isHoveringInteractive) {
		ctx.beginPath()
		ctx.lineWidth = 1
		ctx.strokeStyle = baseColor
		ctx.lineCap = 'round'

		const speed = 0.7
		trail.forEach((point, index) => {
			const nextPoint = trail[index + 1] || cursor
			point.x += (nextPoint.x - point.x) * speed
			point.y += (nextPoint.y - point.y) * speed
			if (index === 0) {
				ctx.moveTo(point.x, point.y)
			} else {
				ctx.lineTo(point.x, point.y)
			}
		})
		ctx.stroke()
	}

	// Ustalanie właściwości laserowego kółka
	targetRadius = isHoveringInteractive ? 14 : 4
	cursorColor = isHoveringInteractive ? hoverColor : baseColor
	// Płynna interpolacja z jednolitym, wolnym współczynnikiem (dla powiększania i pomniejszania)
	currentRadius += (targetRadius - currentRadius) * 0.05

	// Rysujemy kółko kursora (laser)
	ctx.beginPath()
	ctx.arc(cursor.x, cursor.y, currentRadius, 0, Math.PI * 2)
	ctx.fillStyle = cursorColor
	ctx.fill()

	requestAnimationFrame(animate)
}

// Inicjujemy trail początkowo
for (let i = 0; i < maxTrailLength; i++) {
	trail.push({ x: cursor.x, y: cursor.y })
}

animate()

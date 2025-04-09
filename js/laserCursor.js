const canvas = document.getElementById('laserCursor')
const ctx = canvas.getContext('2d')

// Kolor domyślny (laser) i kolor przy hoverze (tu przezroczysty)
const baseColor = '#8B5CF6'
const hoverColor = 'rgba(0,0,0,0)'

// Ustawienia rozmiaru płótna
canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
})

// Obiekt przechowujący pozycję kursora
const cursor = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2,
}

// Ścieżka lasera (punkty traila)
const trail = []
const maxTrailLength = 30

// Promień kursora
let targetRadius = 4
let currentRadius = 4
let cursorColor = baseColor

// Flagi i element do invertowania
let isHoveringInteractive = false
let wasHoveringInteractive = false
const inversionOverlay = document.getElementById('inversionOverlay')

// Słuchamy tylko ruchu myszy, by aktualizować pozycję.
// Reszta logiki "czy coś jest pod kursorem" dzieje się w pętli animate().
document.addEventListener('mousemove', event => {
	cursor.x = event.clientX
	cursor.y = event.clientY
})

// Na starcie wypełnij tablicę trail punktami startowymi
for (let i = 0; i < maxTrailLength; i++) {
	trail.push({ x: cursor.x, y: cursor.y })
}

function animate() {
	// 1. Sprawdź element pod kursorem
	const el = document.elementFromPoint(cursor.x, cursor.y)
	let newIsHoveringInteractive = false
	if (el) {
		const interactiveEl = el.closest(
			'a, button, input, select, textarea, [onclick], .interactive, [role="button"], [data-interactive]'
		)
		if (interactiveEl) {
			newIsHoveringInteractive = true
		}
	}

	// 2. Jeśli stan hovera się zmienił, zareaguj
	if (newIsHoveringInteractive !== isHoveringInteractive) {
		isHoveringInteractive = newIsHoveringInteractive
		// Jeśli właśnie przestaliśmy hoverować interaktywny element:
		if (!isHoveringInteractive && wasHoveringInteractive) {
			// Wyczyść trail (żeby laser nie „skakał”)
			trail.length = 0
			for (let i = 0; i < maxTrailLength; i++) {
				trail.push({ x: cursor.x, y: cursor.y })
			}
		}
	}

	// 3. Obsługa invertowania overlaya
	if (isHoveringInteractive) {
		inversionOverlay.style.opacity = '1'
		inversionOverlay.style.clipPath = `circle(${targetRadius}px at ${cursor.x}px ${cursor.y}px)`
	} else {
		inversionOverlay.style.opacity = '0'
		inversionOverlay.style.clipPath = `circle(0px at ${cursor.x}px ${cursor.y}px)`
	}

	// 4. Czyścimy płótno
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// 5. Jeśli NIE jesteśmy nad elementem interaktywnym – rysujemy „laser”
	if (!isHoveringInteractive) {
		ctx.beginPath()
		ctx.lineWidth = 1
		ctx.strokeStyle = baseColor
		ctx.lineCap = 'round'

		const speed = 0.7
		trail.forEach((point, index) => {
			const nextPoint = trail[index + 1] || cursor
			// „Doganiamy” następny punkt, by uzyskać efekt „gładkiego” ruchu
			point.x += (nextPoint.x - point.x) * speed
			point.y += (nextPoint.y - point.y) * speed
			if (index === 0) {
				ctx.moveTo(point.x, point.y)
			} else {
				ctx.lineTo(point.x, point.y)
			}
		})
		ctx.stroke()

		// Dodaj najnowszy punkt do końca, usuwaj z przodu, by trail był stałej długości
		trail.push({ x: cursor.x, y: cursor.y })
		if (trail.length > maxTrailLength) {
			trail.shift()
		}
	}

	// 6. Animujemy promień kursora
	targetRadius = isHoveringInteractive ? 14 : 4
	cursorColor = isHoveringInteractive ? hoverColor : baseColor
	currentRadius += (targetRadius - currentRadius) * 0.05

	// 7. Rysujemy „kółko” kursora
	ctx.beginPath()
	ctx.arc(cursor.x, cursor.y, currentRadius, 0, Math.PI * 2)
	ctx.fillStyle = cursorColor
	ctx.fill()

	// Zapamiętujemy, czy w tej klatce byliśmy „interaktywni”
	wasHoveringInteractive = isHoveringInteractive

	// 8. Następna klatka
	requestAnimationFrame(animate)
}

// Uruchom animację
animate()

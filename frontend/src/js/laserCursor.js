const canvas = document.getElementById('laserCursor')
const ctx = canvas.getContext('2d')

const baseColor = '#8B5CF6'
const hoverColor = 'rgba(0,0,0,0)'

canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
})

const cursor = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2,
}

const trail = []
const maxTrailLength = 30

let targetRadius = 4
let currentRadius = 4
let cursorColor = baseColor

let isHoveringInteractive = false
let wasHoveringInteractive = false
const inversionOverlay = document.getElementById('inversionOverlay')


document.addEventListener('mousemove', event => {
	cursor.x = event.clientX
	cursor.y = event.clientY
})

for (let i = 0; i < maxTrailLength; i++) {
	trail.push({ x: cursor.x, y: cursor.y })
}

function animate() {
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

	if (newIsHoveringInteractive !== isHoveringInteractive) {
		isHoveringInteractive = newIsHoveringInteractive

		if (!isHoveringInteractive && wasHoveringInteractive) {
			trail.length = 0
			for (let i = 0; i < maxTrailLength; i++) {
				trail.push({ x: cursor.x, y: cursor.y })
			}
		}
	}

	if (isHoveringInteractive) {
		inversionOverlay.style.opacity = '1'
		inversionOverlay.style.clipPath = `circle(${targetRadius}px at ${cursor.x}px ${cursor.y}px)`
	} else {
		inversionOverlay.style.opacity = '0'
		inversionOverlay.style.clipPath = `circle(0px at ${cursor.x}px ${cursor.y}px)`
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height)

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

		trail.push({ x: cursor.x, y: cursor.y })
		if (trail.length > maxTrailLength) {
			trail.shift()
		}
	}

	targetRadius = isHoveringInteractive ? 14 : 4
	cursorColor = isHoveringInteractive ? hoverColor : baseColor
	currentRadius += (targetRadius - currentRadius) * 0.05

	ctx.beginPath()
	ctx.arc(cursor.x, cursor.y, currentRadius, 0, Math.PI * 2)
	ctx.fillStyle = cursorColor
	ctx.fill()

	wasHoveringInteractive = isHoveringInteractive

	requestAnimationFrame(animate)
}

animate()

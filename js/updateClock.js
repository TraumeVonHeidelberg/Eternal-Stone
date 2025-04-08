let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
let city = 'Local time'

fetch('https://ipapi.co/json/')
	.then(res => res.json())
	.then(data => {
		if (data && data.timezone) {
			timeZone = data.timezone
		}
		if (data && data.city) {
			city = data.city
		} else if (data && data.country_name) {
			city = data.country_name + ' (capital)'
		}
		document.getElementById('city-name').textContent = city + ','
	})
	.catch(() => {
		document.getElementById('city-name').textContent = 'Local time'
	})

function updateClock() {
	const now = new Date()

	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})
		const parts = formatter.formatToParts(now)

		const h = parseInt(parts.find(p => p.type === 'hour').value)
		const m = parseInt(parts.find(p => p.type === 'minute').value)
		const s = parseInt(parts.find(p => p.type === 'second').value)

		const hourDeg = ((h % 12) + m / 60) * 30
		const minuteDeg = (m + s / 60) * 6
		const secondDeg = s * 6

		document.getElementById('hour-hand').style.transform = `rotate(${hourDeg}deg)`
		document.getElementById('minute-hand').style.transform = `rotate(${minuteDeg}deg)`
		document.getElementById('second-hand').style.transform = `rotate(${secondDeg}deg)`

		const pad = n => n.toString().padStart(2, '0')
		document.getElementById('digital-time').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`
	} catch (e) {
		console.error('Błąd w obliczaniu czasu:', e)
	}
}

setInterval(updateClock, 1000)
updateClock()

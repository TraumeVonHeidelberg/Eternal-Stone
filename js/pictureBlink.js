const closed = document.getElementById('eyes-closed')

setInterval(() => {
	if (closed) {
		closed.style.opacity = 1
		setTimeout(() => {
			closed.style.opacity = 0
		}, 800)
	}
}, 5000)

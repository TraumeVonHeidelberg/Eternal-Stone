document.addEventListener('DOMContentLoaded', () => {
	const STORAGE_KEY = 'eternalOptions'
	const DEF = 1

	function load() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { m: DEF, f: DEF }
		} catch {
			return { m: DEF, f: DEF }
		}
	}
	function save(o) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
	}

	const headerItems = [...document.querySelectorAll('.header__list-element')]
	const sections = [...document.querySelectorAll('.section')]
	const navSound = document.getElementById('list-sound')
	const openSound = document.getElementById('eternal-section-open')
	const closeSound = document.getElementById('eternal-section-close')
	const bgMusic = document.getElementById('background-music')
	const fxAudios = [navSound, openSound, closeSound]

	const optIdx = headerItems.findIndex(li => li.textContent.trim().toLowerCase() === 'options')
	const optSection = sections[optIdx]
	const optBtns = [...optSection.querySelectorAll('.options__btn')]
	const optPanels = [...optSection.querySelectorAll('.options__settings-el')]
	const sliders = [...optSection.querySelectorAll('.options__settings-range')]

	let prefs = load()
	let layer = 'header'
	let hIdx = 0
	let bIdx = 0
	let iIdx = -1
	let items = []
	let lastHdrPlayed = -1
	let lastBtnPlayed = -1
	let lastSection = -1

	const play = a => {
		a.currentTime = 0
		a.play().catch(() => {})
	}

	const setVol = (w, v) => {
		v = Math.min(1, Math.max(0, +(+v).toFixed(1)))
		sliders[w].value = v
		sliders[w].parentElement.querySelector('.options__settings-value').textContent = v.toFixed(1)
		if (w === 0) {
			bgMusic.volume = v
			prefs.m = v
		} else {
			fxAudios.forEach(a => (a.volume = v))
			prefs.f = v
		}
		save(prefs)
		play(navSound)
	}
	const resetVolumes = () => [0, 1].forEach(i => setVol(i, DEF))

	sliders.forEach((s, i) => {
		s.min = 0
		s.max = 1
		s.step = 0.1
		setVol(i, i === 0 ? prefs.m : prefs.f)
		s.addEventListener('input', () => setVol(i, s.value))
	})

	const hiHeader = i => {
		headerItems.forEach((li, k) => li.classList.toggle('active', k === i))
		if (lastHdrPlayed !== -1 && layer === 'header') play(navSound)
		lastHdrPlayed = i
	}
	const hiBtn = i => {
		optBtns.forEach((b, k) => b.classList.toggle('active', k === i))
		if (lastBtnPlayed !== -1 && layer === 'optBtns') play(navSound)
		lastBtnPlayed = i
	}
	const hiItem = i => items.forEach((el, k) => el.classList.toggle('active', k === i))
	const showPanel = i => optPanels.forEach((p, k) => p.classList.toggle('panel-hidden', k !== i))

	function openSection(i) {
		if (i >= sections.length) {
			if (lastSection !== -1) {
				play(closeSound)
				sections.forEach(sec => sec.classList.add('hidden'))
			}
			lastSection = -1
			layer = 'header'
			const a = headerItems[i].querySelector('a')
			if (a) window.location.href = a.href
			return
		}
		if (lastSection !== -1 && lastSection !== i) play(closeSound)
		if (lastSection !== i) play(openSound)
		sections.forEach((sec, k) => sec.classList.toggle('hidden', k !== i))
		lastSection = i
		if (i === optIdx) {
			layer = 'optBtns'
			bIdx = 0
			hiBtn(bIdx)
			showPanel(bIdx)
		} else layer = 'section'
	}

	function closeSection() {
		if (lastSection !== -1) {
			play(closeSound)
			sections.forEach(sec => sec.classList.add('hidden'))
		}
		lastSection = -1
		layer = 'header'
		items = []
		iIdx = -1
		lastBtnPlayed = -1
	}

	function enterItems() {
		layer = 'optItems'
		items = [...optPanels[bIdx].querySelectorAll('.options__settings-item')]
		if (items.length) {
			iIdx = 0
			hiItem(iIdx)
		}
		play(openSound)
	}

	function leaveItems() {
		layer = 'optBtns'
		hiItem(iIdx)
		items = []
		iIdx = -1
		play(closeSound)
	}

	hiHeader(hIdx)

	headerItems.forEach((li, i) => {
		li.addEventListener('mouseenter', () => {
			if (layer === 'header') {
				hIdx = i
				hiHeader(i)
			}
		})
		li.addEventListener('click', () => {
			if (layer === 'header') {
				hIdx = i
				hiHeader(i)
				openSection(i)
			}
		})
	})

	optBtns.forEach((b, i) => {
		b.addEventListener('mouseenter', () => {
			if (layer === 'optBtns') {
				bIdx = i
				hiBtn(i)
				showPanel(i)
			}
		})
		b.addEventListener('click', () => {
			if (layer === 'optBtns') {
				bIdx = i
				hiBtn(i)
				showPanel(i)
				enterItems()
			}
		})
	})

	document.addEventListener(
		'keydown',
		e => {
			const k = e.key.toLowerCase(),
				block = a => a.includes(k) && e.preventDefault()
			if (layer === 'header') {
				block(['arrowup', 'arrowdown', 'enter', 'w'])
				if (k === 'arrowdown') {
					hIdx = (hIdx + 1) % headerItems.length
					hiHeader(hIdx)
				} else if (k === 'arrowup') {
					hIdx = (hIdx - 1 + headerItems.length) % headerItems.length
					hiHeader(hIdx)
				} else if (k === 'enter' || k === 'w') openSection(hIdx)
			} else if (layer === 'section') {
				if (k === 'escape' || k === 'q') closeSection()
			} else if (layer === 'optBtns') {
				block(['arrowup', 'arrowdown', 'enter', 'w', 'e', 'escape', 'q'])
				if (k === 'arrowdown') {
					bIdx = (bIdx + 1) % optBtns.length
					hiBtn(bIdx)
					showPanel(bIdx)
				} else if (k === 'arrowup') {
					bIdx = (bIdx - 1 + optBtns.length) % optBtns.length
					hiBtn(bIdx)
					showPanel(bIdx)
				} else if (k === 'enter' || k === 'w') enterItems()
				else if (k === 'e') resetVolumes()
				else if (k === 'escape' || k === 'q') closeSection()
			} else if (layer === 'optItems') {
				block(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', 'w', 'e', 'escape', 'q'])
				const cur = items[iIdx],
					sld = cur?.querySelector('.options__settings-range')
				if (sld && (k === 'arrowleft' || k === 'arrowright')) {
					const d = k === 'arrowright' ? 0.1 : -0.1,
						idx = sliders.indexOf(sld)
					setVol(idx, parseFloat(sld.value) + d)
				} else if (k === 'arrowdown') {
					iIdx = (iIdx + 1) % items.length
					hiItem(iIdx)
				} else if (k === 'arrowup') {
					iIdx = (iIdx - 1 + items.length) % items.length
					hiItem(iIdx)
				} else if ((k === 'enter' || k === 'w') && sld) sld.focus()
				else if (k === 'e') resetVolumes()
				else if (k === 'escape' || k === 'q') leaveItems()
			}
		},
		true
	)
})

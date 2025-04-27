document.addEventListener('DOMContentLoaded', () => {
	const STORAGE_KEY = 'eternalOptions'
	const LANGS = ['English', 'Deutsch', 'Polski']
	const STYLES = ['Decorative', 'Plain']
	const DEF_VOL = 1.0
	const DEF_DISP = 0.5

	const i18n = {
		English: {
			gameplay: 'Gameplay',
			lore: 'Lore',
			options: 'Options',
			quit: 'Quit',
			display: 'Display',
			audio: 'Audio',
			language: 'Language',
			'music.volume': 'Music Volume',
			'sound.effects': 'Sound Effects',
			'text.language': 'Text Language',
			'text.style': 'Text Style',
			close: 'Close',
			select: 'Select',
			defaults: 'Defaults',
			brightness: 'Brightness',
			contrast: 'Contrast',
			saturation: 'Saturation',
		},
		Deutsch: {
			gameplay: 'Gameplay',
			lore: 'Lore',
			options: 'Optionen',
			quit: 'Beenden',
			display: 'Anzeige',
			audio: 'Audio',
			language: 'Sprache',
			'music.volume': 'Musiklautstärke',
			'sound.effects': 'Soundeffekte',
			'text.language': 'Textsprache',
			'text.style': 'Schriftstil',
			close: 'Schließen',
			select: 'Auswählen',
			defaults: 'Standard',
			brightness: 'Helligkeit',
			contrast: 'Kontrast',
			saturation: 'Sättigung',
		},
		Polski: {
			gameplay: 'Gameplay',
			lore: 'Lore',
			options: 'Ustawienia',
			quit: 'Wyjście',
			display: 'Ekran',
			audio: 'Dźwięk',
			language: 'Język',
			'music.volume': 'Głośność Muzyki',
			'sound.effects': 'Efekty dźwiękowe',
			'text.language': 'Język tekstu',
			'text.style': 'Styl tekstu',
			close: 'Zamknij',
			select: 'Wybierz',
			defaults: 'Domyślne',
			brightness: 'Jasność',
			contrast: 'Kontrast',
			saturation: 'Nasycenie',
		},
	}

	const NAMES = {
		English: {
			English: 'English',
			Deutsch: 'German',
			Polski: 'Polish',
			Decorative: 'Decorative',
			Plain: 'Plain',
		},
		Deutsch: {
			English: 'Englisch',
			Deutsch: 'Deutsch',
			Polski: 'Polnisch',
			Decorative: 'Verspielt',
			Plain: 'Schlicht',
		},
		Polski: {
			English: 'Angielski',
			Deutsch: 'Niemiecki',
			Polski: 'Polski',
			Decorative: 'Ozdobny',
			Plain: 'Zwykły',
		},
	}

	const DESC = {
		English: {
			'music.volume': 'Adjust the volume of music',
			'sound.effects': 'Adjust the volume of sound effects',
			'text.language': 'Select language of on-screen text',
			'text.style': 'Choose font style',
			brightness: 'Adjust overall brightness',
			contrast: 'Adjust contrast',
			saturation: 'Adjust colour saturation',
		},
		Deutsch: {
			'music.volume': 'Musiklautstärke einstellen',
			'sound.effects': 'Lautstärke der Effekte einstellen',
			'text.language': 'Sprache der Texte wählen',
			'text.style': 'Schriftstil wählen',
			brightness: 'Gesamthelligkeit anpassen',
			contrast: 'Kontrast anpassen',
			saturation: 'Farbsättigung anpassen',
		},
		Polski: {
			'music.volume': 'Ustaw głośność muzyki',
			'sound.effects': 'Ustaw głośność efektów',
			'text.language': 'Wybierz język tekstu',
			'text.style': 'Wybierz styl czcionki',
			brightness: 'Dostosuj jasność',
			contrast: 'Dostosuj kontrast',
			saturation: 'Dostosuj nasycenie kolorów',
		},
	}

	function loadPrefs() {
		const defaults = {
			m: DEF_VOL,
			f: DEF_VOL,
			br: 1,
			co: 1,
			sa: 1,
			lg: LANGS[0],
			ts: STYLES[0],
		}
		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
			return { ...defaults, ...stored }
		} catch {
			return defaults
		}
	}

	let prefs = loadPrefs()
	const savePrefs = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))

	const play = a => {
		a.currentTime = 0
		a.play().catch(() => {})
	}

	const cycle = (arr, cur, dir) => arr[(arr.indexOf(cur) + (dir === 'next' ? 1 : -1) + arr.length) % arr.length]

	const clamp = v => Math.max(0, Math.min(1, v))

	const setFont = s => (document.body.style.fontFamily = s === 'Plain' ? "'Roboto',sans-serif" : "'Cinzel',serif")

	const headerItems = [...document.querySelectorAll('.header__list-element')]
	const headerVideo = document.getElementById('header-video')
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

	const displaySliders = [...optPanels[0].querySelectorAll('.options__settings-range')]
	const audioSliders = [...optPanels[1].querySelectorAll('.options__settings-range')]
	const propKey = { 0: 'br', 1: 'co', 2: 'sa' }

	//Real range of video filter value
	const dispScale = {
		br: [0.5, 1.5],
		co: [0.5, 1.5],
		sa: [0.5, 1.5],
	}

	const imgsBox = optPanels[0].querySelector('.options__settings-imgs')

	const applyFilter = () => {
		const f = `brightness(${prefs.br}) contrast(${prefs.co}) saturate(${prefs.sa})`
		imgsBox.style.filter = f
		headerVideo.style.filter = f
	}

	const setDisp = (i, sliderVal) => {
		const v = Math.max(0, Math.min(1, +sliderVal))

		displaySliders[i].value = v
		displaySliders[i].parentElement.querySelector('.options__settings-value').textContent = v.toFixed(2)

		const key = propKey[i]
		const [mn, mx] = dispScale[key]
		const real = mn + v * (mx - mn)
		prefs[key] = +real.toFixed(2)

		applyFilter()
		savePrefs()
	}

	displaySliders.forEach((s, i) => {
		s.min = 0
		s.max = 1
		s.step = 0.1

		const key = propKey[i]
		const [mn, mx] = dispScale[key]
		const initSlider = (prefs[key] - mn) / (mx - mn)

		setDisp(i, initSlider)
		s.addEventListener('input', () => {
			setDisp(i, s.value)
			play(navSound)
		})
	})

	applyFilter()

	const setVol = (i, v) => {
		v = +clamp(+v).toFixed(1)
		audioSliders[i].value = v
		audioSliders[i].parentElement.querySelector('.options__settings-value').textContent = v.toFixed(1)
		if (i === 0) {
			bgMusic.volume = v
			prefs.m = v
		} else {
			fxAudios.forEach(a => (a.volume = v))
			prefs.f = v
		}
		savePrefs()
	}

	audioSliders.forEach((s, i) => {
		s.min = 0
		s.max = 1
		s.step = 0.1
		setVol(i, i === 0 ? prefs.m : prefs.f)
		s.addEventListener('input', () => {
			setVol(i, s.value)
			play(navSound)
		})
	})

	const resetVolumes = () => [0, 1].forEach(i => setVol(i, DEF_VOL))

	const langItem = [...optSection.querySelectorAll('.options__settings-item')].find(it =>
		it.querySelector('[data-i18n="text.language"]')
	)
	const styItem = [...optSection.querySelectorAll('.options__settings-item')].find(it =>
		it.querySelector('[data-i18n="text.style"]')
	)

	const langVal = langItem.querySelector('.options__settings-value')
	const styleVal = styItem.querySelector('.options__settings-value')

	const langLeft = langItem.querySelector('.fa-angle-left')
	const langRight = langItem.querySelector('.fa-angle-right')
	const styLeft = styItem.querySelector('.fa-angle-left')
	const styRight = styItem.querySelector('.fa-angle-right')

	const descEl = optSection.querySelector('.options__settings-description')
	let currentKey = 'music.volume'

	const setDesc = key => {
		const active = document.querySelector('.options__settings-el.active')
		if (active && key) descEl.textContent = (DESC[prefs.lg] && DESC[prefs.lg][key]) || key
		descEl.style.opacity = active ? '1' : '0'
	}

	const updateTexts = lang => {
		document.querySelectorAll('[data-i18n]').forEach(el => {
			const k = el.dataset.i18n
			if (i18n[lang] && i18n[lang][k]) el.textContent = i18n[lang][k]
		})
		langVal.textContent = NAMES[lang][prefs.lg] || prefs.lg
		styleVal.textContent = NAMES[lang][prefs.ts] || prefs.ts
		setDesc(currentKey)
	}

	const setLang = v => {
		prefs.lg = v
		savePrefs()
		play(navSound)
		updateTexts(v)
	}

	const setStyle = v => {
		prefs.ts = v
		savePrefs()
		setFont(v)
		play(navSound)
		updateTexts(prefs.lg)
	}

	setFont(prefs.ts)
	updateTexts(prefs.lg)

	langLeft.addEventListener('click', () => setLang(cycle(LANGS, prefs.lg, 'prev')))
	langRight.addEventListener('click', () => setLang(cycle(LANGS, prefs.lg, 'next')))
	styLeft.addEventListener('click', () => setStyle(cycle(STYLES, prefs.ts, 'prev')))
	styRight.addEventListener('click', () => setStyle(cycle(STYLES, prefs.ts, 'next')))

	let layer = 'header',
		hIdx = 0,
		bIdx = 0,
		iIdx = -1,
		items = []
	let lastHdr = -1,
		lastBtn = -1,
		lastSec = -1

	const hiHdr = i => {
		headerItems.forEach((li, k) => li.classList.toggle('active', k === i))
		if (lastHdr !== -1 && layer === 'header') play(navSound)
		lastHdr = i
	}

	const hiBtn = i => {
		optBtns.forEach((b, k) => b.classList.toggle('active', k === i))
		if (lastBtn !== -1 && layer === 'optBtns') play(navSound)
		lastBtn = i
	}

	const hiItm = i => {
		items.forEach((el, k) => {
			el.classList.toggle('active', k === i)
			el.querySelector('.options__settings-text')?.classList.toggle('active', k === i)
			el.querySelector('.options__settings-indicator')?.classList.toggle('active', k === i)
		})
		const key = items[i]?.querySelector('.options__settings-text')?.dataset.i18n
		if (key) {
			currentKey = key
			setDesc(key)
		} // ← przywrócone
		play(navSound)
	}

	const showPanel = i => {
		optPanels.forEach((p, k) => {
			p.classList.toggle('panel-hidden', k !== i)
			p.classList.remove('active')
		})
	}

	const openSec = i => {
		if (i >= sections.length) {
			const a = headerItems[i].querySelector('a.header__link')
			if (a) {
				window.location.href = a.href
				return
			}
			return
		}

		if (lastSec !== -1 && lastSec !== i) play(closeSound)
		if (lastSec !== i) play(openSound)
		sections.forEach((s, k) => s.classList.toggle('hidden', k !== i))
		lastSec = i
		if (i === optIdx) {
			layer = 'optBtns'
			bIdx = 0
			hiBtn(bIdx)
			showPanel(bIdx)
			setDesc('')
		} else {
			layer = 'section'
			setDesc('')
		}
	}

	const closeSec = () => {
		if (lastSec !== -1) {
			play(closeSound)
			sections.forEach(s => s.classList.add('hidden'))
		}
		lastSec = -1
		layer = 'header'
		items = []
		iIdx = -1
		lastBtn = -1
		setDesc('')
	}

	const enterItems = () => {
		layer = 'optItems'
		optPanels[bIdx].classList.add('active')
		items = [...optPanels[bIdx].querySelectorAll('.options__settings-item')]

		items.forEach((el, k) => {
			el.addEventListener('mouseenter', () => {
				iIdx = k
				hiItm(k)
			})
			el.addEventListener('mouseleave', () => {
				el.querySelector('.options__settings-text')?.classList.remove('active')
				el.querySelector('.options__settings-indicator')?.classList.remove('active')
				const key = items[iIdx]?.querySelector('.options__settings-text')?.dataset.i18n
				setDesc(key || '')
			})
		})

		if (items.length) {
			iIdx = 0
			hiItm(0)
		}
		play(openSound)
	}

	const leaveItems = () => {
		layer = 'optBtns'
		optPanels[bIdx].classList.remove('active')
		items.forEach(el => {
			el.querySelector('.options__settings-text')?.classList.remove('active')
			el.querySelector('.options__settings-indicator')?.classList.remove('active')
		})
		items = []
		iIdx = -1
		setDesc('')
		play(closeSound)
	}

	hiHdr(hIdx)

	headerItems.forEach((li, i) => {
		li.addEventListener('mouseenter', () => {
			if (layer === 'header') {
				hIdx = i
				hiHdr(i)
			}
		})

		li.addEventListener('click', e => {
			const link = e.currentTarget.querySelector('a.header__link')
			if (link) {
				window.location.href = link.href
				return
			}

			hIdx = i
			hiHdr(i)
			openSec(i)
		})
	})

	optBtns.forEach((b, i) => {
		b.addEventListener('mouseenter', () => {
			if (layer !== 'header') {
				bIdx = i
				hiBtn(i)
				showPanel(i)
				if (layer === 'optBtns') setDesc('')
			}
		})

		b.addEventListener('click', () => {
			if (layer === 'optItems') leaveItems()

			bIdx = i
			hiBtn(i)
			showPanel(i)
			layer = 'optBtns'
			enterItems()
		})
	})

	const adjDisp = (sl, delta) => {
		const idx = displaySliders.indexOf(sl)
		if (idx === -1) return
		setDisp(idx, +sl.value + delta)
		play(navSound)
	}

	document.addEventListener(
		'keydown',
		e => {
			const k = e.key.toLowerCase()
			const stop = arr => {
				if (arr.includes(k)) e.preventDefault()
			}

			if (layer === 'header') {
				stop(['arrowup', 'arrowdown', 'enter', 'w'])
				if (k === 'arrowdown') {
					hIdx = (hIdx + 1) % headerItems.length
					hiHdr(hIdx)
				} else if (k === 'arrowup') {
					hIdx = (hIdx - 1 + headerItems.length) % headerItems.length
					hiHdr(hIdx)
				} else if (['enter', 'w'].includes(k)) openSec(hIdx)
			} else if (layer === 'section') {
				if (['escape', 'q'].includes(k)) closeSec()
			} else if (layer === 'optBtns') {
				stop(['arrowup', 'arrowdown', 'enter', 'w', 'e', 'escape', 'q'])
				if (k === 'arrowdown') {
					bIdx = (bIdx + 1) % optBtns.length
					hiBtn(bIdx)
					showPanel(bIdx)
					setDesc('')
				} else if (k === 'arrowup') {
					bIdx = (bIdx - 1 + optBtns.length) % optBtns.length
					hiBtn(bIdx)
					showPanel(bIdx)
					setDesc('')
				} else if (['enter', 'w'].includes(k)) enterItems()
				else if (k === 'e') resetVolumes()
				else if (['escape', 'q'].includes(k)) closeSec()
			} else if (layer === 'optItems') {
				stop(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'escape', 'q'])
				const cur = items[iIdx]
				const sld = cur?.querySelector('.options__settings-range')
				const txt = cur?.querySelector('.options__settings-text')?.dataset.i18n

				if (sld && ['arrowleft', 'arrowright'].includes(k)) {
					const d = k === 'arrowright' ? 0.1 : -0.1
					const di = displaySliders.indexOf(sld)
					if (di !== -1) {
						setDisp(di, +sld.value + d)
						play(navSound)
					} else {
						const ai = audioSliders.indexOf(sld)
						if (ai !== -1) {
							setVol(ai, +sld.value + d)
							play(navSound)
						}
					}
				} else if (txt && ['arrowleft', 'arrowright'].includes(k)) {
					if (txt === 'text.language') {
						prefs.lg = cycle(LANGS, prefs.lg, k === 'arrowright' ? 'next' : 'prev')
						savePrefs()
						play(navSound)
						updateTexts(prefs.lg)
					} else if (txt === 'text.style') {
						prefs.ts = cycle(STYLES, prefs.ts, k === 'arrowright' ? 'next' : 'prev')
						savePrefs()
						setFont(prefs.ts)
						play(navSound)
						updateTexts(prefs.lg)
					}
				} else if (k === 'arrowdown') {
					iIdx = (iIdx + 1) % items.length
					hiItm(iIdx)
				} else if (k === 'arrowup') {
					iIdx = (iIdx - 1 + items.length) % items.length
					hiItm(iIdx)
				} else if (k === 'e') {
					resetVolumes()
				} else if (['escape', 'q'].includes(k)) {
					leaveItems()
				}
			}
		},
		true
	)
})

import { i18n, DESC } from './locales.js'
import { CHAR_INFO } from './charData.js'
import { createViewer } from './displayModel.js'
import { WORLD_LOC } from './locationsData.js'

document.addEventListener('DOMContentLoaded', () => {
	const STORAGE_KEY = 'eternalOptions'
	const CHAR_IDX_KEY = 'charLastIdx'

	const LANGS = ['English', 'Deutsch', 'Polski']
	const STYLES = ['Decorative', 'Plain']
	const DEF_VOL = 1.0

	const defaults = { m: DEF_VOL, f: DEF_VOL, br: 1, co: 1, sa: 1.5, lg: LANGS[0], ts: STYLES[0] }
	const prefs = (() => {
		try {
			return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }
		} catch {
			return defaults
		}
	})()
	const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
	const play = a => {
		a.currentTime = 0
		a.play().catch(() => {})
	}
	const cycle = (a, c, d) => a[(a.indexOf(c) + (d === 'next' ? 1 : -1) + a.length) % a.length]
	const clamp = v => Math.min(1, Math.max(0, v))
	const setFont = s => {
		document.body.style.fontFamily = s === 'Plain' ? "'Roboto',sans-serif" : "'Cinzel',serif"
	}

	const headerEl = document.querySelector('header')
	const headerItems = [...document.querySelectorAll('.header__list-element')]
	const headerVideo = document.getElementById('header-video')
	const sections = [...document.querySelectorAll('.section')]
	const navSound = document.getElementById('list-sound')
	const openSound = document.getElementById('eternal-section-open')
	const closeSound = document.getElementById('eternal-section-close')
	const bgMusic = document.getElementById('background-music')
	const fxAudios = [navSound, openSound, closeSound]

	const optIdx = headerItems.findIndex(li => li.textContent.trim().toLowerCase() === 'options')
	const loreIdx = headerItems.findIndex(li => li.textContent.trim().toLowerCase() === 'lore')

	const gameIdx = headerItems.findIndex(li => li.textContent.trim().toLowerCase() === 'gameplay')
	let game = null

	const optSec = sections[optIdx]
	const loreSec = sections[loreIdx]
	const locSec = document.querySelector('.section.locations')

	const optBtns = [...optSec.querySelectorAll('.options__btn')]
	const optPanels = [...optSec.querySelectorAll('.options__settings-el')]
	const loreBtns = [...loreSec.querySelectorAll('.lore__nav-btn')]
	const lorePanels = [loreSec.querySelector('.lore__world'), loreSec.querySelector('.lore__character')]

	const displaySliders = [...optPanels[0].querySelectorAll('.options__settings-range')]
	const audioSliders = [...optPanels[1].querySelectorAll('.options__settings-range')]
	const propKey = { 0: 'br', 1: 'co', 2: 'sa' }
	const dispScale = { br: [0.5, 1.5], co: [0.5, 1.5], sa: [0.5, 1.5] }
	const imgsBox = optPanels[0].querySelector('.options__settings-imgs')

	const viewer = createViewer('.lore__character-canvas')
	const charTitle = loreSec.querySelector('.lore__character-title')
	const charDesc = loreSec.querySelector('.lore__character-description')
	const charStats = loreSec.querySelectorAll('.lore__character-list-item--attributes')
	const leftArrow = loreSec.querySelector('.fa-chevron-left.lore__character-icon')
	const rightArrow = loreSec.querySelector('.fa-chevron-right.lore__character-icon')

	const locList = [...locSec.querySelectorAll('.locations__list-item')]
	const locImg = locSec.querySelector('.locations__img')
	const locDesc = locSec.querySelector('.locations__description')
	const locHeader = locSec.querySelector('.locations__header')

	let preloadIdx = +localStorage.getItem(CHAR_IDX_KEY) || 0
	if (preloadIdx < 0 || preloadIdx >= CHAR_INFO.length) preloadIdx = 0

	const loadChar = idx => {
		const c = CHAR_INFO[idx]
		const lang = prefs.lg
		charTitle.textContent = i18n[lang][c.titleKey] || ''
		charDesc.textContent = i18n[lang][c.descKey] || ''
		viewer.show(c.model, c.rotY || 0, c.yOffset || 0)
		const attrs = c.attributes || {}
		charStats.forEach(statEl => {
			const [nameEl, valEl] = statEl.querySelectorAll('.lore__character-list-text--attributes')
			if (nameEl && valEl) valEl.textContent = attrs[nameEl.textContent.trim()] ?? 0
		})
		localStorage.setItem(CHAR_IDX_KEY, idx)
		preloadIdx = idx
	}

	loadChar(preloadIdx)

	let wIdx = 0
	let locIdx = 0
	const showLocation = (world, idx) => {
		const lang = prefs.lg
		const loc = world.locs[idx]

		locHeader.textContent = i18n[lang][world.titleKey] || world.titleKey
		locImg.style.backgroundImage = `url(${loc.img})`
		locDesc.textContent = i18n[lang][loc.descKey] || loc.descKey

		locList.forEach((li, k) => li.classList.toggle('active', k === idx))
		locIdx = idx
	}

	const setLoc = idx => {
		showLocation(WORLD_LOC[wIdx], idx)
		hiLocItem(idx)
		locIdx = idx
	}

	const hiLocItem = i => {
		locList.forEach((el, k) => el.classList.toggle('active', k === i))
		play(navSound)
	}

	const loadWorld = () => {
		const world = WORLD_LOC[wIdx]
		const lang = prefs.lg

		while (locList.length < world.locs.length) {
			const li = document.createElement('li')
			li.className = 'locations__list-item'
			locSec.querySelector('.locations__list').append(li)
			locList.push(li)
			li.addEventListener('mouseenter', () => layer === 'locations' && showLocation(world, locList.indexOf(li)))
			li.addEventListener('click', () => layer === 'locations' && showLocation(world, locList.indexOf(li)))
		}

		locList.forEach((li, i) => {
			if (world.locs[i]) {
				li.textContent = i18n[lang][world.locs[i].navKey] || world.locs[i].navKey
				li.style.display = ''
			} else {
				li.style.display = 'none'
			}
		})

		setLoc(0)
	}

	loadWorld()

	const applyFilter = () => {
		const f = `brightness(${prefs.br}) contrast(${prefs.co}) saturate(${prefs.sa})`
		imgsBox.style.filter = f
		headerVideo.style.filter = f
	}
	const setDisp = (i, val) => {
		const v = clamp(+val)
		displaySliders[i].value = v
		displaySliders[i].parentElement.querySelector('.options__settings-value').textContent = v.toFixed(2)
		const key = propKey[i]
		const [mn, mx] = dispScale[key]
		prefs[key] = +(mn + v * (mx - mn)).toFixed(2)
		applyFilter()
		save()
	}
	displaySliders.forEach((s, i) => {
		s.min = 0
		s.max = 1
		s.step = 0.1
		const key = propKey[i]
		const [mn, mx] = dispScale[key]
		setDisp(i, (prefs[key] - mn) / (mx - mn))
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
		save()
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
	const resetVol = () => [0, 1].forEach(i => setVol(i, DEF_VOL))
	const resetDisp = () =>
		['br', 'co', 'sa'].forEach((k, i) => {
			const [mn, mx] = dispScale[k]
			setDisp(i, ((k === 'sa' ? 1.5 : 1) - mn) / (mx - mn))
		})
	const resetLang = () => {
		prefs.lg = LANGS[0]
		prefs.ts = STYLES[0]
		save()
		updateTexts(prefs.lg)
		play(navSound)
	}

	const langItem = [...optSec.querySelectorAll('.options__settings-item')].find(n =>
		n.querySelector('[data-i18n="text.language"]')
	)
	const styItem = [...optSec.querySelectorAll('.options__settings-item')].find(n =>
		n.querySelector('[data-i18n="text.style"]')
	)
	const langVal = langItem.querySelector('.options__settings-value')
	const styVal = styItem.querySelector('.options__settings-value')
	const langLeft = langItem.querySelector('.fa-angle-left')
	const langRight = langItem.querySelector('.fa-angle-right')
	const styLeft = styItem.querySelector('.fa-angle-left')
	const styRight = styItem.querySelector('.fa-angle-right')
	const descEl = optSec.querySelector('.options__settings-description')
	let currentKey = 'music.volume'

	const setDesc = k => {
		const act = document.querySelector('.options__settings-el.active')
		if (act && k) descEl.textContent = (DESC[prefs.lg] && DESC[prefs.lg][k]) || k
		descEl.style.opacity = act ? '1' : '0'
	}
	const updateTexts = lang => {
		document.querySelectorAll('[data-i18n]').forEach(el => {
			const k = el.dataset.i18n
			if (i18n[lang] && i18n[lang][k]) el.textContent = i18n[lang][k]
		})
		langVal.textContent = (i18n[lang] && i18n[lang][prefs.lg]) || prefs.lg
		styVal.textContent = (i18n[lang] && i18n[lang][prefs.ts]) || prefs.ts
		setDesc(currentKey)
	}
	const setLang = v => {
		prefs.lg = v
		save()
		play(navSound)
		updateTexts(v)
	}
	const setSty = v => {
		prefs.ts = v
		save()
		setFont(v)
		play(navSound)
		updateTexts(prefs.lg)
	}
	setFont(prefs.ts)
	updateTexts(prefs.lg)
	langLeft.addEventListener('click', () => setLang(cycle(LANGS, prefs.lg, 'prev')))
	langRight.addEventListener('click', () => setLang(cycle(LANGS, prefs.lg, 'next')))
	styLeft.addEventListener('click', () => setSty(cycle(STYLES, prefs.ts, 'prev')))
	styRight.addEventListener('click', () => setSty(cycle(STYLES, prefs.ts, 'next')))

	let layer = 'header'
	let hIdx = 0
	let bIdx = 0
	let lIdx = 0
	let iIdx = -1
	let items = []
	let loreItems = []
	let liIdx = -1
	let lastHdr = -1
	let lastBtn = -1
	let lastLore = -1
	let lastSec = -1

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
	const hiLore = i => {
		loreBtns.forEach((b, k) => b.classList.toggle('active', k === i))
		if (lastLore !== -1 && layer === 'loreBtns') play(navSound)
		lastLore = i
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
		}
		play(navSound)
	}
	const hiLoreItem = i => {
		if (lIdx === 0) {
			loreItems.forEach((el, k) => {
				const a = k === i
				el.classList.toggle('active', a)
				el.querySelector('img')?.classList.toggle('active', a)
			})
		} else {
			loreItems.forEach((el, k) => {
				const a = k === i
				el.querySelector('.lore__character-list-indicator')?.classList.toggle('active', a)
				el.querySelector('.lore__character-list-text')?.classList.toggle('active', a)
			})
			loadChar(i)
		}
		play(navSound)
	}

	const showPanel = i =>
		optPanels.forEach((p, k) => {
			p.classList.toggle('panel-hidden', k !== i)
			p.classList.remove('active')
		})
	const showLoreP = i => lorePanels.forEach((p, k) => p.classList.toggle('panel-hidden', k !== i))
	const actLore = i => lorePanels.forEach((p, k) => p.classList.toggle('active', k === i))

	const openLoc = () => {
		play(openSound)
		headerEl.classList.add('hidden')
		sections.forEach(s => s.classList.add('hidden'))
		locSec.classList.remove('hidden')
		layer = 'locations'

		wIdx = liIdx
		loadWorld()
	}
	const closeLoc = () => {
		play(closeSound)

		locSec.classList.add('hidden') 
		sections.forEach(s => s.classList.add('hidden'))
		loreSec.classList.remove('hidden') 

		layer = 'loreItems' 

		lIdx = 0 
		hiLore(lIdx)
		showLoreP(lIdx)
		actLore(lIdx)

		hiLoreItem(liIdx) 
	}

	const openSec = i => {
		if (i >= sections.length) {
			const a = headerItems[i].querySelector('a.header__link')
			if (a) window.location.href = a.href
			return
		}

		if (lastSec === gameIdx && i !== gameIdx && game) {
			game.pauseGame()
			if (document.pointerLockElement) document.exitPointerLock()
		}
		if (lastSec !== -1 && lastSec !== i) play(closeSound)
		if (lastSec !== i) play(openSound)
		headerEl.classList.remove('hidden')
		sections.forEach((s, k) => s.classList.toggle('hidden', k !== i))
		lastSec = i
		if (i === optIdx) {
			layer = 'optBtns'
			bIdx = 0
			hiBtn(bIdx)
			showPanel(bIdx)
			setDesc('')
		} else if (i === loreIdx) {
			layer = 'loreBtns'
			lIdx = 0
			hiLore(lIdx)
			showLoreP(lIdx)
		} else if (i === gameIdx) {
			layer = 'section'

			if (!game) {
				import('./game.js').then(mod => {
					game = mod
					game.startGame()
				})
			} else {
				game.resumeGame()
			}
		} else layer = 'section'
	}
	const closeSec = () => {
		headerEl.classList.remove('hidden')
		if (lastSec !== -1) {
			play(closeSound)
			sections.forEach(s => s.classList.add('hidden'))
			lorePanels.forEach(p => p.classList.remove('active'))
		}
		if (lastSec === gameIdx && game) {
			game.pauseGame()
		}
		lastSec = -1
		layer = 'header'
		items = []
		iIdx = -1
		lastBtn = -1
		lastLore = -1
		setDesc('')
	}

	const enterItems = () => {
		layer = 'optItems'
		optPanels[bIdx].classList.add('active')
		items = [...optPanels[bIdx].querySelectorAll('.options__settings-item')]
		items.forEach((el, k) => {
			const over = () => {
				iIdx = k
				hiItm(k)
			}
			el.addEventListener('mouseenter', over)
			el._overHandler = over
			el.addEventListener('mouseleave', () => {
				el.querySelector('.options__settings-text')?.classList.remove('active')
				el.querySelector('.options__settings-indicator')?.classList.remove('active')
				setDesc('')
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
			el.removeEventListener('mouseenter', el._overHandler)
		})
		items = []
		iIdx = -1
		setDesc('')
		play(closeSound)
	}

	const enterLoreItems = () => {
		layer = 'loreItems'
		actLore(lIdx)
		const panel = lorePanels[lIdx]
		loreItems =
			lIdx === 0
				? [...panel.querySelectorAll('.lore__world-item')]
				: [...panel.querySelectorAll('.lore__character-list-item:not(.lore__character-list-item--attributes)')]
		if (loreItems.length) {
			liIdx = lIdx === 1 ? preloadIdx : 0
			hiLoreItem(liIdx)
			if (lIdx === 1) viewer.setInteractive(true)
		}
		loreItems.forEach((el, k) => {
			const over = () => {
				liIdx = k
				hiLoreItem(k)
			}
			el.addEventListener('mouseenter', over)
			el._overHandler = over
			if (lIdx === 0) {
				el.addEventListener('click', openLoc)
				el._clickHandler = openLoc
			}
		})
		play(openSound)
	}

	const leaveLoreItems = () => {
		loreItems.forEach(el => {
			el.classList.remove('active')
			el.querySelector('img')?.classList.remove('active')
			el.querySelector('.lore__character-list-indicator')?.classList.remove('active')
			el.querySelector('.lore__character-list-text')?.classList.remove('active')
			el.removeEventListener('mouseenter', el._overHandler)
			delete el._overHandler
			if (lIdx === 0 && el._clickHandler) {
				el.removeEventListener('click', el._clickHandler)
				delete el._clickHandler
			}
		})
		viewer.setInteractive(false)
		loreItems = []
		liIdx = -1
		layer = 'loreBtns'
		lorePanels.forEach(p => p.classList.remove('active'))
		play(closeSound)
	}

	leftArrow.addEventListener('click', () => {
		if (layer === 'loreItems' && lIdx === 1 && loreItems.length) {
			liIdx = (liIdx - 1 + loreItems.length) % loreItems.length
			hiLoreItem(liIdx)
		}
	})
	rightArrow.addEventListener('click', () => {
		if (layer === 'loreItems' && lIdx === 1 && loreItems.length) {
			liIdx = (liIdx + 1) % loreItems.length
			hiLoreItem(liIdx)
		}
	})

	locList.forEach((li, i) => {
		li.addEventListener('mouseenter', () => {
			if (layer === 'locations') {
				locIdx = i
				const world = WORLD_LOC[wIdx]
				setLoc(i)
			}
		})
		li.addEventListener('click', () => {
			if (layer === 'locations') {
				const world = WORLD_LOC[wIdx]
				setLoc(i)
			}
		})
	})

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
			if (layer === 'optItems') leaveItems()
			if (layer !== 'header') {
				bIdx = i
				hiBtn(i)
				showPanel(i)
				setDesc('')
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
	loreBtns.forEach((b, i) => {
		b.addEventListener('mouseenter', () => {
			if (layer === 'loreBtns') {
				lIdx = i
				hiLore(i)
				showLoreP(i)
			}
		})
		b.addEventListener('click', () => {
			lIdx = i
			hiLore(i)
			showLoreP(i)
			enterLoreItems()
		})
	})

	document.addEventListener(
		'keydown',
		e => {
			const k = e.key.toLowerCase()
			const stop = a => {
				if (a.includes(k)) e.preventDefault()
			}
			if (layer === 'header') {
				stop(['arrowup', 'arrowdown', 'enter', 'w'])
				if (k === 'arrowdown') {
					hIdx = (hIdx + 1) % headerItems.length
					hiHdr(hIdx)
				} else if (k === 'arrowup') {
					hIdx = (hIdx - 1 + headerItems.length) % headerItems.length
					hiHdr(hIdx)
				} else if (['enter', 'w'].includes(k)) {
					const link = headerItems[hIdx].querySelector('a.header__link')
					if (link) {
						window.location.href = link.href
					} else {
						openSec(hIdx)
					}
				}
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
				else if (k === 'e') {
					if (bIdx === 0) resetDisp()
					else if (bIdx === 1) resetVol()
					else if (bIdx === 2) resetLang()
				} else if (['escape', 'q'].includes(k)) closeSec()
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
						save()
						play(navSound)
						updateTexts(prefs.lg)
					} else if (txt === 'text.style') {
						prefs.ts = cycle(STYLES, prefs.ts, k === 'arrowright' ? 'next' : 'prev')
						save()
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
					if (bIdx === 0) resetDisp()
					else if (bIdx === 1) resetVol()
					else if (bIdx === 2) resetLang()
				} else if (['escape', 'q'].includes(k)) leaveItems()
			} else if (layer === 'loreBtns') {
				stop(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'enter', 'w', 'escape', 'q'])
				if (['arrowright', 'arrowdown'].includes(k)) {
					lIdx = (lIdx + 1) % loreBtns.length
					hiLore(lIdx)
					showLoreP(lIdx)
				} else if (['arrowleft', 'arrowup'].includes(k)) {
					lIdx = (lIdx - 1 + loreBtns.length) % loreBtns.length
					hiLore(lIdx)
					showLoreP(lIdx)
				} else if (['enter', 'w'].includes(k)) enterLoreItems()
				else if (['escape', 'q'].includes(k)) closeSec()
			} else if (layer === 'loreItems') {
				stop(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', 'w', 'escape', 'q'])
				if (['arrowright', 'arrowdown'].includes(k)) {
					liIdx = (liIdx + 1) % loreItems.length
					hiLoreItem(liIdx)
				} else if (['arrowleft', 'arrowup'].includes(k)) {
					liIdx = (liIdx - 1 + loreItems.length) % loreItems.length
					hiLoreItem(liIdx)
				} else if (['enter', 'w'].includes(k) && lIdx === 0) openLoc()
				else if (['escape', 'q'].includes(k)) leaveLoreItems()
			} else if (layer === 'locations') {
				stop(['arrowup', 'arrowdown', 'escape', 'q'])
				if (k === 'arrowdown') {
					setLoc((locIdx + 1) % locList.length)
				} else if (k === 'arrowup') {
					setLoc((locIdx - 1 + locList.length) % locList.length)
				} else if (['escape', 'q'].includes(k)) closeLoc()
			}
		},
		true
	)

	locSec.querySelector('.section__control-btn')?.addEventListener('click', closeLoc)
})

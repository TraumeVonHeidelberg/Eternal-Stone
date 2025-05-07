import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

const CB = 6,
	CU = 1,
	MD = 1,
	MS = 0.02,
	SPD = 5,
	BSPD = 10,
	STEP = 1,
	SENS = 0.002,
	INV = 1,
	STAMINA_COST = 20,
	STAMINA_REGEN = 10,
	RUN_COOLDOWN = 1.5, // Nowa stała - cooldown biegu w sekundach
	MIN_STAMINA_TO_RUN = 1, // Minimalna stamina do biegu
	BOSS_ANIM_SPEED = 1.2,
	BOSS_SCALE = 0.03,
	PLAYER_DAMAGE = 10,
	BOSS_MAX_HP = 100,
	BOSS_ATTACK_RADIUS = 100 * BOSS_SCALE, // Nowa stała dla zasięgu ataku
	BOSS_ATTACK_DAMAGE = 15, // Nowa stała dla obrażeń
	BOSS_ATTACK_COOLDOWN = 2000,
	BOSS_ATTACK_ANIMATION_SPEED = 1.5,
	BOSS_ANIMATION_TRANSITION = 0.2,
	MAX_STEP_HEIGHT = 0.5

let scene,
	camera,
	renderer,
	player,
	camRig,
	mix,
	boss,
	bmix,
	idle,
	walk,
	run,
	atk,
	drink,
	block,
	isBlocking = false,
	bossTimer = null,
	bossHealthBar,
	bossHP = BOSS_MAX_HP,
	bossAttackAction,
	isBossAttacking = false,
	pHP = 100,
	stamina = 100,
	prev = 0,
	canAtk = true,
	move = 0,
	inv = 0,
	ip = new THREE.Vector3(),
	ib = new THREE.Vector3(),
	started = 0,
	paused = 1,
	raf = 0,
	healthBar,
	staminaBar,
	potionEl,
	usedPotion = false,
	isDrinking = false,
	lastRunBlockTime = 0

let swordMesh
const swordBox = new THREE.Box3()
const bossBox = new THREE.Box3()
let hitRegistered = false

/**
 * Płynne przejście między animacjami
 * @param {THREE.AnimationAction} targetAction – docelowa akcja
 * @param {number} duration – czas cross-fade’u w sekundach
 */
function transitionTo(targetAction, duration = 0.2) {
	if (!targetAction) return
	targetAction.reset().fadeIn(duration).play()
	;[idle, walk, run, atk, drink, block].forEach(a => {
		// Dodano block
		if (a && a !== targetAction && a.isRunning()) {
			a.fadeOut(duration)
		}
	})
}

const keys = { KeyW: 0, KeyS: 0, KeyA: 0, KeyD: 0, ShiftLeft: 0 },
	ray = new THREE.Raycaster(),
	camRay = new THREE.Raycaster(),
	dn = new THREE.Vector3(0, -1, 0),
	lvl = []

export function startGame() {
	if (started) return resumeGame()
	started = 1
	paused = 0
	init()
	prev = performance.now()
	loop()
}

export function pauseGame() {
	if (paused) return
	paused = 1
	cancelAnimationFrame(raf)
	clearInterval(bossTimer)
	bossTimer = null
	document.exitPointerLock?.()
}

export function resumeGame() {
	if (!started || !paused) return
	paused = 0
	prev = performance.now()
	if (!bossTimer) bossTimer = setInterval(bossHit, 2000)
	loop()
}

function init() {
	scene = new THREE.Scene()
	scene.background = new THREE.Color(0x202020)
	camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1e3)
	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setPixelRatio(devicePixelRatio)
	renderer.setSize(innerWidth, innerHeight)
	renderer.shadowMap.enabled = true
	document.querySelector('.gameplay').append(renderer.domElement)

	// Stworzenie obiektu gracza
	player = new THREE.Object3D()
	scene.add(player)

	// Kamera w rig-u
	camRig = new THREE.Object3D()
	camRig.position.set(0, CU, 0)
	player.add(camRig)
	camera.position.set(0, 0, CB)
	camRig.add(camera)

	// UI
	healthBar = document.querySelector('.gameplay__bar-fill--health')
	staminaBar = document.querySelector('.gameplay__bar-fill--stamina')
	potionEl = document.querySelector('.gameplay__inventory-img--potion')
	bossHealthBar = document.querySelector('.gameplay__bar-fill--boss-health')
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'

	// Ładowanie modelu gracza
	const fb = new FBXLoader()
	fb.load('/img/eternal-game-assets/player.fbx', m => {
		setup(m, player)
		mix = new THREE.AnimationMixer(m)
		loadAnims(fb)
		mix.addEventListener('finished', e => {
			if (e.action === atk) {
				e.action.fadeOut(0.15) // Dodaj fade-out dla ataku
				canAtk = true
				checkMovement()
			} else if (e.action === drink) {
				e.action.fadeOut(0.15) // Dodaj fade-out dla picia
				isDrinking = false
				canAtk = true
				checkMovement()
			}
		})
	})

	// Ładowanie modelu bossa
	const fb2 = new FBXLoader()
	fb2.load('/img/eternal-game-assets/boss.fbx', m => {
		setup(m)
		boss = m

		// Ustawienie początkowej pozycji bossa z raycastingiem
		const bossSpawnPoint = new THREE.Vector3(20, 100, 20) // Tymczasowo wysoko nad mapą
		const down = new THREE.Vector3(0, -1, 0)

		// Wykonaj raycasting aby znaleźć podłoże
		ray.set(bossSpawnPoint, down)
		const hits = ray.intersectObjects(lvl, true)

		let spawnY = 0
		if (hits.length) {
			spawnY = hits[0].point.y + BOSS_SCALE * 2 // Dodaj margines bezpieczeństwa
		}

		// Ustaw skalę i pozycję
		boss.scale.set(BOSS_SCALE, BOSS_SCALE, BOSS_SCALE)
		boss.position.set(20, spawnY, 20) // X i Z na stałe, Y z raycastingu
		boss.rotation.y = Math.PI // Obróć bossa przodem do gracza

		scene.add(m)
		bmix = new THREE.AnimationMixer(m)

		// Ładowanie animacji biegu
		const bossRunLoader = new FBXLoader()
		bossRunLoader.load('/img/eternal-game-assets/boss-run.fbx', anim => {
			if (anim.animations.length > 0) {
				const runClip = anim.animations[0]
				const bossRunAction = bmix.clipAction(runClip)
				bossRunAction.timeScale = BOSS_ANIM_SPEED
				bossRunAction.setEffectiveWeight(1.0)
				bossRunAction.play()

				// Aktualizuj pozycję po załadowaniu animacji
				boss.position.set(20, spawnY, 20)
			} else {
				console.error('Brak animacji w pliku boss-run.fbx!')
			}
		})

		const bossAttackLoader = new FBXLoader()
		bossAttackLoader.load('/img/eternal-game-assets/boss-attack1.fbx', anim => {
			const attackClip = anim.animations[0]
			bossAttackAction = bmix.clipAction(attackClip)
			bossAttackAction.setLoop(THREE.LoopOnce)
			bossAttackAction.clampWhenFinished = true
		})

		bossTimer = setInterval(bossHit, 2000)
	})

	// Ładowanie mapy i ustawienie pozycji startowej gracza
	new GLTFLoader().load('/img/eternal-game-assets/map.glb', g => {
		g.scene.traverse(c => {
			if (c.isMesh) {
				c.castShadow = c.receiveShadow = true
				lvl.push(c)
			}
		})

		g.scene.scale.set(10, 10, 10)
		scene.add(g.scene)

		// Zmodyfikuj pozycję Y spawnPoint na wyższą wartość (np. 500)
		const spawnPoint = new THREE.Vector3(0, 500, 10) // Zmiana Y z 100 na 500
		const down = new THREE.Vector3(0, -1, 0)
		ray.set(spawnPoint, down)
		const hits = ray.intersectObjects(lvl, true)
		let startY = spawnPoint.y
		if (hits.length) {
			startY = hits[0].point.y + STEP
		}
		player.position.set(spawnPoint.x, startY, spawnPoint.z)
		ip.copy(player.position)

		// --------------------------------------------------

		// Teraz, kiedy gracz ustawiony, możemy włączyć idle
		idle?.play()
	})

	// Oświetlenie
	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1))
	const d = new THREE.DirectionalLight(0xffffff, 0.8)
	d.position.set(-10, 20, -10)
	d.castShadow = true
	scene.add(d)

	addEvents()
}

function updateCameraCollision() {
	// pozycja "głowy" gracza w świecie
	const headWorld = player.localToWorld(new THREE.Vector3(0, CU, 0))
	// docelowa pozycja kamery w lokalnych współrzędnych rig’a
	const desiredCamLocal = new THREE.Vector3(0, 0, CB)
	const desiredCamWorld = camRig.localToWorld(desiredCamLocal.clone())
	// kierunek od głowy do kamery
	const dir = new THREE.Vector3().subVectors(desiredCamWorld, headWorld).normalize()
	camRay.set(headWorld, dir)
	camRay.far = CB
	const hits = camRay.intersectObjects(lvl, true)
	if (hits.length) {
		// jeśli jest kolizja, cofnij kamerę tuż przed przeszkodą
		const dist = hits[0].distance - 0.3 // margines 0.3
		camera.position.set(0, 0, Math.max(0.5, dist))
	} else {
		// inaczej pełna odległość
		camera.position.set(0, 0, CB)
	}
}

function setup(m, p = scene) {
	m.traverse(c => {
		if (c.isMesh) {
			c.castShadow = c.receiveShadow = true
			// ← tutaj: jeżeli to nasz miecz, złap referencję
			if (c.name === 'Paladin_J_Nordstrom_Sword') {
				swordMesh = c
				console.log('Złapano mesh miecza:', c.name)
			}
		}
	})
	m.scale.setScalar(MS)
	m.position.set(0, -MD, 0)
	m.rotation.y = Math.PI
	p.add(m)
}

function loadAnims(loader) {
	loader.load('/img/eternal-game-assets/idle.fbx', a => (idle = clip(a, true)))
	loader.load('/img/eternal-game-assets/walk.fbx', a => (walk = clip(a)))
	loader.load('/img/eternal-game-assets/run.fbx', a => (run = clip(a)))
	loader.load('/img/eternal-game-assets/attack.fbx', a => (atk = clip(a, false, true)))
	loader.load('/img/eternal-game-assets/drink.fbx', a => (drink = clip(a, false, true)))
	loader.load('/img/eternal-game-assets/block.fbx', a => {
		const ac = mix.clipAction(a.animations[0])
		ac.setLoop(THREE.LoopRepeat)
		ac.clampWhenFinished = true
		block = ac
	})

	function clip(a, auto = false, once = false) {
		const ac = mix.clipAction(a.animations[0])
		ac.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat)
		ac.clampWhenFinished = true
		if (auto) ac.play()
		return ac
	}
}

function loop() {
	if (paused) return
	raf = requestAnimationFrame(loop)
	const dt = (performance.now() - prev) / 1000
	prev = performance.now()

	// Aktualizuj wszystkie animacje gracza
	mix?.update(dt)

	// ← DETEKCJA KOLIZJI MIECZ–BOSS
	if (atk?.isRunning() && !hitRegistered && swordMesh && boss) {
		// ułamek czasu trwania animacji (0.0–1.0)
		const t = atk.time / atk.getClip().duration
		// okienko, w którym klinga leci przez bossowy mesh
		if (t > 0.2 && t < 0.4) {
			// aktualizacja bounding boxów
			swordBox.setFromObject(swordMesh)
			bossBox.setFromObject(boss)
			// jeśli się przecinają, raz zadaj obrażenia
			if (swordBox.intersectsBox(bossBox)) {
				hitRegistered = true
				bossHP = Math.max(0, bossHP - PLAYER_DAMAGE)
				bossHealthBar.style.width = `${(bossHP / BOSS_MAX_HP) * 100}%`
				if (bossHP <= 0) finish(true)
			}
		}
	}

	// Aktualizuj wszystkie animacje bossa
	bmix?.update(dt)

	// Reszta dotychczasowej logiki
	updPlayer(dt)
	updBoss(dt)
	regenStamina(dt)
	updateCameraCollision()
	renderer.render(scene, camera)
}

function addEvents() {
	// Klawiatura
	addEventListener('keydown', e => {
		keys[e.code] = 1
		if (e.code === 'KeyE') usePotion()
	})
	addEventListener('keyup', e => (keys[e.code] = 0))

	// Ruch myszy (obrót kamery)
	document.body.addEventListener('mousemove', e => {
		if (document.pointerLockElement !== document.body) return
		player.rotation.y -= e.movementX * SENS
		camRig.rotation.x -= e.movementY * SENS
	})

	// Lewy przycisk – atak
	document.body.addEventListener('mousedown', e => {
		if (e.button === 0 && document.pointerLockElement) swing()
	})

	// Prawy przycisk – blokowanie tarczą
	// 1) Zablokuj menu kontekstowe
	document.body.addEventListener('contextmenu', e => e.preventDefault())
	// 2) Mousedown => start bloku
	document.body.addEventListener('mousedown', e => {
		if (e.button === 2 && document.pointerLockElement && !isDrinking) {
			isBlocking = true
			transitionTo(block, 0.1)[
				// Zatrzymaj inne animacje
				(idle, walk, run, atk, drink)
			].forEach(a => a?.stop())
		}
	})
	// 3) Mouseup => koniec bloku
	document.body.addEventListener('mouseup', e => {
		if (e.button === 2) {
			isBlocking = false
			checkMovement()
		}
	})

	// Lock pointer na click
	document.body.addEventListener('click', () => {
		if (!document.pointerLockElement) document.body.requestPointerLock()
	})

	// Resize okna
	addEventListener('resize', () => {
		camera.aspect = innerWidth / innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(innerWidth, innerHeight)
	})
}

function updPlayer(dt) {
	// Blokada ruchu podczas picia
	if (isDrinking || isBlocking) return

	// Aktualizacja wektora ruchu
	const dir = new THREE.Vector3(keys.KeyA ? -1 : keys.KeyD ? 1 : 0, 0, keys.KeyW ? -1 : keys.KeyS ? 1 : 0)
	const mv = dir.lengthSq() > 0

	// Logika blokady biegu
	const timeSinceLastBlock = performance.now() - lastRunBlockTime
	const runBlocked = timeSinceLastBlock < RUN_COOLDOWN * 1000
	const effectiveMinStamina = runBlocked ? 30 : MIN_STAMINA_TO_RUN
	const runPressed = keys.ShiftLeft && stamina >= effectiveMinStamina && !runBlocked
	const speed = runPressed ? BSPD : SPD

	// Aktualizacja stanu animacji tylko jeśli nie jesteśmy w trakcie ataku/picia
	if (!atk?.isRunning() && !drink?.isRunning()) {
		// Sprawdź zmianę stanu ruchu
		if (mv !== move || runPressed !== updPlayer.wasRunning) {
			move = mv
			updPlayer.wasRunning = runPressed

			if (mv) {
				transitionTo(runPressed ? run : walk, 0.15)
			} else {
				transitionTo(idle, 0.15)
			}
		}
	}

	// Aktualizacja pozycji gracza
	if (mv && !atk?.isRunning() && !isDrinking) {
		step(dir.normalize(), dt, speed)

		// Zużycie staminy dla biegu
		if (runPressed) {
			stamina = Math.max(0, stamina - STAMINA_COST * dt)
			if (stamina < effectiveMinStamina) {
				lastRunBlockTime = performance.now()
				stamina = Math.min(stamina, effectiveMinStamina - 0.1)
			}
		}
	}

	// Fizyka i aktualizacja UI
	grav()
	camClamp()
	staminaBar.style.width = `${Math.floor(stamina)}%`
}

function regenStamina(dt) {
	if (stamina < 100) {
		stamina = Math.min(100, stamina + STAMINA_REGEN * dt)
		// Usuń resetowanie lastRunBlockTime podczas regeneracji
		if (stamina > 99.9) stamina = 100
	}
}
updPlayer.wasRunning = false

function step(dir, dt, speed) {
	// obliczamy wektor ruchu w świecie
	const w = dir.applyQuaternion(player.quaternion)
	const moveDistance = (stamina > 0 ? speed : SPD) * dt
	const moveVector = w.clone().multiplyScalar(moveDistance)

	// nowa, proponowana pozycja (tylko XY)
	const proposedPos = player.position.clone().add(moveVector)

	// rzutujemy w dół z wysokości ok. 2×STEP, aby znaleźć poziom terenu
	const downOrigin = proposedPos.clone().add(new THREE.Vector3(0, STEP * 2, 0))
	ray.set(downOrigin, dn)
	const hit = ray.intersectObjects(lvl, true)[0]

	if (hit) {
		const groundY = hit.point.y + STEP
		const deltaY = groundY - player.position.y

		// jeśli różnica wysokości jest w dopuszczalnym limicie, wykonujemy ruch
		if (deltaY <= MAX_STEP_HEIGHT) {
			player.position.set(proposedPos.x, groundY, proposedPos.z)
		}
		// w przeciwnym razie – blokujemy ruch (postać nie wchodzi na przeszkodę)
	} else {
		// wolna przestrzeń – normalny ruch po płaskim
		player.position.add(moveVector)
	}
}

function grav() {
	ray.set(player.position.clone().add(new THREE.Vector3(0, STEP * 2, 0)), dn)
	const g = ray.intersectObjects(lvl, true)[0]
	if (g) player.position.y = g.point.y + STEP
}

function camClamp() {
	camRig.rotation.x = THREE.MathUtils.clamp(camRig.rotation.x, -Math.PI / 3, Math.PI / 3)
}

function swing() {
	if (isDrinking || !canAtk || stamina < STAMINA_COST) return

	// resetujemy flagę, by w tej animacji znów móc trafić bossa
	hitRegistered = false

	// blokujemy kolejny atak do czasu zakończenia animacji
	canAtk = false

	// start animacji ataku
	transitionTo(atk, 0.1)

	// odejmujemy staminy i aktualizujemy pasek
	stamina = Math.max(0, stamina - STAMINA_COST)
	staminaBar.style.width = `${stamina}%`
}

function updBoss(dt) {
	if (!boss || pHP <= 0 || isBossAttacking) return

	// 1. Ruch poziomy
	const direction = new THREE.Vector3().subVectors(player.position, boss.position).normalize()
	const speed = BSPD * dt * Math.min(1, player.position.distanceTo(boss.position) / 10)
	boss.position.addScaledVector(direction, speed)

	// 2. Raycast w dół
	const origin = boss.position.clone().add(new THREE.Vector3(0, BOSS_SCALE * 2, 0))
	ray.set(origin, dn)
	const hit = ray.intersectObjects(lvl, true)[0]
	if (hit) {
		boss.position.y = hit.point.y + BOSS_SCALE * 2
	}

	// 3. Obrót tylko w osi Y
	const target = player.position.clone()
	target.y = boss.position.y // ← wyrównujemy wysokość
	boss.lookAt(target)
}
function bossHit() {
	if (!boss || pHP <= 0 || isBossAttacking) return

	const distance = player.position.distanceTo(boss.position)

	if (distance < BOSS_ATTACK_RADIUS) {
		isBossAttacking = true

		// Odtwórz animację ataku
		bossAttackAction.reset().play()

		// Zadaj obrażenia po 0.5s animacji
		setTimeout(() => {
			// jeśli blokujemy, otrzymujemy tylko 40% obrażeń
			const damage = isBlocking ? Math.ceil(BOSS_ATTACK_DAMAGE * 0.4) : BOSS_ATTACK_DAMAGE

			pHP = Math.max(0, pHP - damage)
			healthBar.style.width = `${pHP}%`

			if (pHP <= 0) finish(false)

			// invincibility frame
			inv = 1
			setTimeout(() => (inv = 0), INV * 1000)

			isBossAttacking = false
		}, 500)
	}
}

function usePotion() {
	if (usedPotion || isDrinking || pHP >= 100 || !drink) return
	usedPotion = true
	isDrinking = true
	canAtk = false
	idle?.stop()
	walk?.stop()
	run?.stop()
	drink.reset().play()
	potionEl?.classList.add('hidden')
	pHP = Math.min(100, pHP + 50)
	healthBar.style.width = `${pHP}%`
}

function finish(victory) {
	setTimeout(() => {
		alert(victory ? 'You have beaten Narebutsuki!' : 'Game Over!')
		reset()
	}, 100)
}

function reset() {
	player.position.copy(ip)
	boss.position.copy(ib)
	pHP = 100
	bossHP = BOSS_MAX_HP // Reset zdrowia bossa
	stamina = 100
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'
	bossHealthBar.style.width = '100%' // Reset paska bossa
	potionEl?.classList.remove('hidden')
	usedPotion = false
	isDrinking = false
	canAtk = true
	isBossAttacking = false
	if (bossAttackAction) bossAttackAction.stop()
	inv = 0
	idle?.play()
}

function checkMovement() {
	if (isBlocking) return // Blokada zmiany animacji podczas blokowania

	const movePressed = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD
	const runPossible = stamina > MIN_STAMINA_TO_RUN

	if (movePressed) {
		transitionTo(keys.ShiftLeft && runPossible ? run : walk, 0.15)
	} else {
		transitionTo(idle, 0.15)
	}
}

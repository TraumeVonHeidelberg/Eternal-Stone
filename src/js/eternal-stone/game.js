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
	RUN_COOLDOWN = 1.5,
	MIN_STAMINA_TO_RUN = 1,
	BOSS_ANIM_SPEED = 1.2,
	BOSS_SCALE = 0.03,
	PLAYER_DAMAGE = 10,
	BOSS_MAX_HP = 100,
	BOSS_ATTACK_RADIUS = 100 * BOSS_SCALE,
	BOSS_ATTACK_DAMAGE = 15,
	MAX_STEP_HEIGHT = 0.5,
	AVOID_DISTANCE = 5,
	AVOID_STRENGTH = 2.5,
	BOSS_SPAWN_POINT = new THREE.Vector3(50, 20, 50),
	BOSS_AGRO_DISTANCE = 30,
	BOSS_IDLE_SPEED = 0,
	BOSS_CHASE_SPEED = BSPD

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
	ip = new THREE.Vector3(),
	ib = new THREE.Vector3(),
	inv = 0,
	started = 0,
	paused = 1,
	raf = 0,
	healthBar,
	staminaBar,
	potionEl,
	usedPotion = false,
	isDrinking = false,
	lastRunBlockTime = 0,
	swordMesh,
	hitRegistered = false,
	bossState = 'idle'

const swordBox = new THREE.Box3()
const bossBox = new THREE.Box3()
const bossUI = document.querySelector('.gameplay__boss-ui')

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

	player = new THREE.Object3D()
	scene.add(player)

	camRig = new THREE.Object3D()
	camRig.position.set(0, CU, 0)
	player.add(camRig)
	camera.position.set(0, 0, CB)
	camRig.add(camera)

	healthBar = document.querySelector('.gameplay__bar-fill--health')
	staminaBar = document.querySelector('.gameplay__bar-fill--stamina')
	potionEl = document.querySelector('.gameplay__inventory-img--potion')
	bossHealthBar = document.querySelector('.gameplay__bar-fill--boss-health')
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'

	const fb = new FBXLoader()
	fb.load('/img/eternal-game-assets/player.fbx', m => {
		setup(m, player)
		mix = new THREE.AnimationMixer(m)
		loadAnims(fb)
		mix.addEventListener('finished', e => {
			if (e.action === atk) {
				e.action.fadeOut(0.15)
				canAtk = true
				checkMovement()
			} else if (e.action === drink) {
				e.action.fadeOut(0.15)
				isDrinking = false
				canAtk = true
				checkMovement()
			}
		})
	})

	new GLTFLoader().load('/img/eternal-game-assets/map.glb', g => {
		g.scene.traverse(c => {
			if (c.isMesh) {
				c.castShadow = c.receiveShadow = true
				lvl.push(c)
			}
		})

		g.scene.scale.set(10, 10, 10)
		scene.add(g.scene)

		const spawnPoint = new THREE.Vector3(0, 500, 10)
		const down = new THREE.Vector3(0, -1, 0)
		ray.set(spawnPoint, down)
		const hits = ray.intersectObjects(lvl, true)
		let startY = spawnPoint.y
		if (hits.length) {
			startY = hits[0].point.y + STEP
		}
		player.position.set(spawnPoint.x, startY, spawnPoint.z)
		ip.copy(player.position)

		idle?.play()
	})

	const fb2 = new FBXLoader()
	fb2.load('/img/eternal-game-assets/boss.fbx', m => {
		// Podstawowa konfiguracja modelu
		setup(m)
		boss = m
		bossState = 'idle'

		// Transformacje
		boss.scale.set(BOSS_SCALE, BOSS_SCALE, BOSS_SCALE)
		boss.rotation.y = Math.PI

		// Kolizja z podłożem
		const spawnPoint = BOSS_SPAWN_POINT.clone()
		const rayOrigin = spawnPoint.clone().setY(1000)
		ray.set(rayOrigin, new THREE.Vector3(0, -1, 0))
		const hits = ray.intersectObjects(lvl, true)

		// Pozycja Y
		const groundY = hits.length ? hits[0].point.y : 50
		boss.position.set(
			spawnPoint.x,
			groundY + BOSS_SCALE * 2, // Dostosowanie do skali
			spawnPoint.z
		)
		ib.copy(boss.position)

		// Dodanie do sceny
		scene.add(m)
		if (!bossTimer) bossTimer = setInterval(bossHit, 2000)

		// Inicjalizacja systemu animacji
		bmix = new THREE.AnimationMixer(m)

		// Ładowanie animacji
		const loadAnimations = () => {
			// Animacja Idle
			new FBXLoader().load('/img/eternal-game-assets/boss-idle.fbx', anim => {
				boss.idleAction = bmix.clipAction(anim.animations[0])
				boss.idleAction.setLoop(THREE.LoopRepeat)
				boss.idleAction.play() // Kluczowe: odtwarzaj od razu!
			})

			// Animacja Stand (przejście do walki)
			new FBXLoader().load('/img/eternal-game-assets/boss-stand.fbx', anim => {
				boss.standAction = bmix.clipAction(anim.animations[0])
				boss.standAction.setLoop(THREE.LoopOnce)
				boss.standAction.clampWhenFinished = true
			})

			// Animacja Biegu
			new FBXLoader().load('/img/eternal-game-assets/boss-run.fbx', anim => {
				boss.runAction = bmix.clipAction(anim.animations[0])
				boss.runAction.timeScale = BOSS_ANIM_SPEED
			})

			new FBXLoader().load('/img/eternal-game-assets/boss-attack1.fbx', anim => {
				bossAttackAction = bmix.clipAction(anim.animations[0]);
				bossAttackAction.setLoop(THREE.LoopOnce);
				bossAttackAction.clampWhenFinished = true;
			  });

			// Event zmiany stanu
			bmix.addEventListener('finished', e => {
				if (e.action === boss.standAction && bossState === 'standing') {
					bossState = 'chasing'
					boss.runAction.play()
				}
			})
		}

		// Od razu ładujemy animacje
		loadAnimations()
	})

	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1))
	const d = new THREE.DirectionalLight(0xffffff, 0.8)
	d.position.set(-10, 20, -10)
	d.castShadow = true
	scene.add(d)

	addEvents()
}

function updateCameraCollision() {
	const headWorld = player.localToWorld(new THREE.Vector3(0, CU, 0))

	const desiredCamLocal = new THREE.Vector3(0, 0, CB)
	const desiredCamWorld = camRig.localToWorld(desiredCamLocal.clone())

	const dir = new THREE.Vector3().subVectors(desiredCamWorld, headWorld).normalize()
	camRay.set(headWorld, dir)
	camRay.far = CB
	const hits = camRay.intersectObjects(lvl, true)
	if (hits.length) {
		const dist = hits[0].distance - 0.3
		camera.position.set(0, 0, Math.max(0.5, dist))
	} else {
		camera.position.set(0, 0, CB)
	}
}

function setup(m, p = scene) {
	m.traverse(c => {
		if (c.isMesh) {
			c.castShadow = c.receiveShadow = true
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

	mix?.update(dt)

	if (atk?.isRunning() && !hitRegistered && swordMesh && boss) {
		const t = atk.time / atk.getClip().duration

		if (t > 0.2 && t < 0.4) {
			swordBox.setFromObject(swordMesh)
			bossBox.setFromObject(boss)

			if (swordBox.intersectsBox(bossBox)) {
				hitRegistered = true
				bossHP = Math.max(0, bossHP - PLAYER_DAMAGE)
				bossHealthBar.style.width = `${(bossHP / BOSS_MAX_HP) * 100}%`
				if (bossHP <= 0) finish(true)
			}
		}
	}

	bmix?.update(dt)

	updPlayer(dt)
	updBoss(dt)
	regenStamina(dt)
	updateCameraCollision()
	renderer.render(scene, camera)
}

function addEvents() {
	addEventListener('keydown', e => {
		keys[e.code] = 1
		if (e.code === 'KeyE') usePotion()
	})
	addEventListener('keyup', e => (keys[e.code] = 0))

	document.body.addEventListener('mousemove', e => {
		if (document.pointerLockElement !== document.body) return
		player.rotation.y -= e.movementX * SENS
		camRig.rotation.x -= e.movementY * SENS
	})

	document.body.addEventListener('mousedown', e => {
		if (e.button === 0 && document.pointerLockElement) swing()
	})

	document.body.addEventListener('contextmenu', e => e.preventDefault())

	document.body.addEventListener('mousedown', e => {
		if (e.button === 2 && document.pointerLockElement && !isDrinking) {
			isBlocking = true
			transitionTo(block, 0.1)[(idle, walk, run, atk, drink)].forEach(a => a?.stop())
		}
	})

	document.body.addEventListener('mouseup', e => {
		if (e.button === 2) {
			isBlocking = false
			checkMovement()
		}
	})

	document.body.addEventListener('click', () => {
		if (!document.pointerLockElement) document.body.requestPointerLock()
	})

	addEventListener('resize', () => {
		camera.aspect = innerWidth / innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(innerWidth, innerHeight)
	})
}

function updPlayer(dt) {
	if (isDrinking || isBlocking) return

	const dir = new THREE.Vector3(keys.KeyA ? -1 : keys.KeyD ? 1 : 0, 0, keys.KeyW ? -1 : keys.KeyS ? 1 : 0)
	const mv = dir.lengthSq() > 0

	const timeSinceLastBlock = performance.now() - lastRunBlockTime
	const runBlocked = timeSinceLastBlock < RUN_COOLDOWN * 1000
	const effectiveMinStamina = runBlocked ? 30 : MIN_STAMINA_TO_RUN
	const runPressed = keys.ShiftLeft && stamina >= effectiveMinStamina && !runBlocked
	const speed = runPressed ? BSPD : SPD

	if (!atk?.isRunning() && !drink?.isRunning()) {
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

	if (mv && !atk?.isRunning() && !isDrinking) {
		step(dir.normalize(), dt, speed)

		if (runPressed) {
			stamina = Math.max(0, stamina - STAMINA_COST * dt)
			if (stamina < effectiveMinStamina) {
				lastRunBlockTime = performance.now()
				stamina = Math.min(stamina, effectiveMinStamina - 0.1)
			}
		}
	}

	grav()
	camClamp()
	staminaBar.style.width = `${Math.floor(stamina)}%`
}

function regenStamina(dt) {
	if (stamina < 100) {
		stamina = Math.min(100, stamina + STAMINA_REGEN * dt)
		if (stamina > 99.9) stamina = 100
	}
}
updPlayer.wasRunning = false

function step(dir, dt, speed) {
	const w = dir.applyQuaternion(player.quaternion)
	const moveDistance = (stamina > 0 ? speed : SPD) * dt
	const moveVector = w.clone().multiplyScalar(moveDistance)

	const proposedPos = player.position.clone().add(moveVector)

	const downOrigin = proposedPos.clone().add(new THREE.Vector3(0, STEP * 2, 0))
	ray.set(downOrigin, dn)
	const hit = ray.intersectObjects(lvl, true)[0]

	if (hit) {
		const groundY = hit.point.y + STEP
		const deltaY = groundY - player.position.y

		if (deltaY <= MAX_STEP_HEIGHT) {
			player.position.set(proposedPos.x, groundY, proposedPos.z)
		}
	} else {
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

	hitRegistered = false

	canAtk = false

	transitionTo(atk, 0.1)

	stamina = Math.max(0, stamina - STAMINA_COST)
	staminaBar.style.width = `${stamina}%`
}

function getAvoidance(pos, dir) {
	const origin = pos.clone().add(new THREE.Vector3(0, BOSS_SCALE * 2, 0))
	const avoid = new THREE.Vector3()
	const up = new THREE.Vector3(0, 1, 0)

	;[0, 0.5, -0.5].forEach(angle => {
		const rDir = dir.clone().applyAxisAngle(up, angle).normalize()
		const avoidRay = new THREE.Raycaster(origin, rDir, 0, AVOID_DISTANCE)
		if (avoidRay.intersectObjects(lvl, true).length > 0) {
			const perp = new THREE.Vector3(-rDir.z, 0, rDir.x)
			if (angle > 0) avoid.add(perp)
			else avoid.sub(perp)
		}
	})

	if (avoid.lengthSq() > 0) {
		return avoid.normalize().multiplyScalar(AVOID_STRENGTH)
	}
	return new THREE.Vector3(0, 0, 0)
}

function updBoss(dt) {
	if (!boss || pHP <= 0 || isBossAttacking) return

	// Obliczenia podstawowe
	const toPlayer = player.position.clone().sub(boss.position)
	const distanceToPlayer = toPlayer.length()
	const prevState = bossState

	// Automat stanów
	if (distanceToPlayer > BOSS_AGRO_DISTANCE) {
		switch (bossState) {
			case 'chasing':
				bossState = 'idle'
				boss.runAction?.stop()
				boss.idleAction?.reset().play()
				break
			case 'standing':
				bossState = 'idle'
				boss.standAction?.stop()
				boss.idleAction?.reset().play()
				break
		}
	} else {
		if (bossState === 'idle') {
			bossState = 'standing'
			boss.idleAction?.stop()
			boss.standAction?.reset().play()
			bossUI.classList.remove('hidden')
		}
	}

	// Aktualizacja animacji tylko przy zmianie stanu
	if (prevState !== bossState) {
		console.log(`Boss state changed: ${prevState} -> ${bossState}`)
	}

	// Stała korekta pozycji Y bez względu na stan
	const origin = boss.position.clone().add(new THREE.Vector3(0, BOSS_SCALE * 2, 0))
	ray.set(origin, dn)
	const hit = ray.intersectObjects(lvl, true)[0]
	if (hit) {
		boss.position.y = hit.point.y + BOSS_SCALE * 2
	} else {
		// Fallback - delikatne opuszczanie gdy brak kolizji
		boss.position.y -= 0.1 * dt
	}

	// Logika ruchu tylko w stanie pościgu
	if (bossState === 'chasing') {
		toPlayer.normalize()
		const avoid = getAvoidance(boss.position, toPlayer)
		const moveDir = toPlayer.add(avoid).normalize()

		const speed = BOSS_CHASE_SPEED * dt * Math.min(1, distanceToPlayer / 10)
		boss.position.addScaledVector(moveDir, speed)

		// Rotacja
		const lookTarget = boss.position.clone().add(moveDir)
		lookTarget.y = boss.position.y
		boss.lookAt(lookTarget)
	}
}

function bossHit() {
	if (!boss || pHP <= 0 || isBossAttacking) return

	const distance = player.position.distanceTo(boss.position)

	if (distance < BOSS_ATTACK_RADIUS) {
		isBossAttacking = true

		bossAttackAction.reset().play()

		setTimeout(() => {
			const damage = isBlocking ? Math.ceil(BOSS_ATTACK_DAMAGE * 0.4) : BOSS_ATTACK_DAMAGE

			pHP = Math.max(0, pHP - damage)
			healthBar.style.width = `${pHP}%`

			if (pHP <= 0) finish(false)

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
	bossHP = BOSS_MAX_HP
	stamina = 100
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'
	bossHealthBar.style.width = '100%'
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
	if (isBlocking) return
	const movePressed = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD
	const runPossible = stamina > MIN_STAMINA_TO_RUN

	if (movePressed) {
		transitionTo(keys.ShiftLeft && runPossible ? run : walk, 0.15)
	} else {
		transitionTo(idle, 0.15)
	}
}

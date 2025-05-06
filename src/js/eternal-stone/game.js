import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

const CB = 6,
	CU = 1,
	MD = 1,
	MS = 0.02,
	SPD = 5,
	BSPD = 10,
	STEP = 1.5,
	SENS = 0.002,
	INV = 1,
	STAMINA_COST = 20,
	STAMINA_REGEN = 10

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
	bossTimer = null,
	bossHP = 100,
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
	isDrinking = false

const keys = { KeyW: 0, KeyS: 0, KeyA: 0, KeyD: 0, ShiftLeft: 0 },
	ray = new THREE.Raycaster(),
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
	player.position.set(0, 0, 10)
	scene.add(player)
	ip.copy(player.position)

	camRig = new THREE.Object3D()
	camRig.position.set(0, CU, 0)
	player.add(camRig)
	camera.position.set(0, 0, CB)
	camRig.add(camera)

	healthBar = document.querySelector('.gameplay__bar-fill--health')
	staminaBar = document.querySelector('.gameplay__bar-fill--stamina')
	potionEl = document.querySelector('.gameplay__inventory-img--potion')
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'

	const fb = new FBXLoader()
	fb.load('/img/eternal-game-assets/player.fbx', m => {
		setup(m, player)
		mix = new THREE.AnimationMixer(m)
		loadAnims(fb)
		mix.addEventListener('finished', e => {
			if (e.action === atk) {
				canAtk = true
				if (move) {
					if (keys.ShiftLeft && stamina > 0) run?.play()
					else walk?.play()
				} else idle?.play()
			} else if (e.action === drink) {
				isDrinking = false
				canAtk = true
				idle?.play()
			}
		})
	})

	const fb2 = new FBXLoader()
	fb2.load('/img/eternal-game-assets/boss.fbx', m => {
		setup(m)
		boss = m
		const f = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
		m.position.copy(player.position.clone().addScaledVector(f, 15))
		ib.copy(m.position)
		scene.add(m)
		bmix = new THREE.AnimationMixer(m)
		bossTimer = setInterval(bossHit, 2000)
	})

	new GLTFLoader().load('/img/eternal-game-assets/modular_dungeon.glb', g => {
		g.scene.traverse(c => c.isMesh && ((c.castShadow = c.receiveShadow = true), lvl.push(c)))
		scene.add(g.scene)
	})

	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1))
	const d = new THREE.DirectionalLight(0xffffff, 0.8)
	d.position.set(-10, 20, -10)
	d.castShadow = true
	scene.add(d)

	addEvents()
}

function setup(m, p = scene) {
	m.traverse(c => c.isMesh && (c.castShadow = c.receiveShadow = true))
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
	bmix?.update(dt)
	updPlayer(dt)
	updBoss(dt)
	regenStamina(dt)
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
	document.body.addEventListener('click', () => !document.pointerLockElement && document.body.requestPointerLock())
	addEventListener('resize', () => {
		camera.aspect = innerWidth / innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize(innerWidth, innerHeight)
	})
}

function updPlayer(dt) {
	if (isDrinking) return
	const dir = new THREE.Vector3(keys.KeyA ? -1 : keys.KeyD ? 1 : 0, 0, keys.KeyW ? -1 : keys.KeyS ? 1 : 0)
	const mv = dir.lengthSq() > 0
	const runPressed = keys.ShiftLeft && stamina > 0
	const speed = runPressed ? 10 : SPD
	if (mv !== move || runPressed !== updPlayer.wasRunning) {
		move = mv
		updPlayer.wasRunning = runPressed
		if (atk?.isRunning()) return
		idle?.stop()
		walk?.stop()
		run?.stop()
		if (mv) (runPressed ? run : walk)?.play()
		else idle?.play()
	}
	if (mv) step(dir.normalize(), dt, speed)
	if (mv && runPressed) stamina = Math.max(0, stamina - STAMINA_COST * dt)
	grav()
	camClamp()
	staminaBar.style.width = `${stamina}%`
}
updPlayer.wasRunning = false

function step(dir, dt, speed) {
	const w = dir.applyQuaternion(player.quaternion)
	const o = player.position.clone().add(new THREE.Vector3(0, STEP, 0))
	ray.set(o, w)
	const h = ray.intersectObjects(lvl, true)[0]
	const s = speed * dt
	if (!h || h.distance > s + 0.2) player.position.addScaledVector(w, s)
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
	canAtk = false
	atk.reset().play()
	stamina = Math.max(0, stamina - STAMINA_COST)
	staminaBar.style.width = `${stamina}%`
}

function regenStamina(dt) {
	if (stamina < 100) {
		stamina = Math.min(100, stamina + STAMINA_REGEN * dt)
		staminaBar.style.width = `${stamina}%`
	}
}

function updBoss(dt) {
	if (!boss || pHP <= 0) return
	const v = player.position.clone().sub(boss.position)
	if (v.length() > 2) {
		boss.position.addScaledVector(v.normalize(), BSPD * dt)
		boss.lookAt(player.position)
	}
}

function bossHit() {
	if (!boss || pHP <= 0) return
	if (player.position.distanceTo(boss.position) < 5 && !inv) {
		pHP = Math.max(0, pHP - 10)
		healthBar.style.width = `${pHP}%`
		if (!pHP) return finish(false)
		inv = 1
		setTimeout(() => (inv = 0), INV * 1000)
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
		alert(victory ? 'Zwycięstwo!' : 'Game Over!')
		reset()
	}, 100)
}

function reset() {
	player.position.copy(ip)
	boss.position.copy(ib)
	pHP = bossHP = 100
	stamina = 100
	healthBar.style.width = '100%'
	staminaBar.style.width = '100%'
	potionEl?.classList.remove('hidden')
	usedPotion = false
	isDrinking = false
	canAtk = true
	inv = 0
	idle?.play()
}

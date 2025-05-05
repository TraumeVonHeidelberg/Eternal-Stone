import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

// --------------------------- KONFIG --------------------------- //
const CAMERA_BACK = 6
const CAMERA_UP = 1
const MODEL_DOWN = 1
const MODEL_SCALE = 0.02

const MOVE_SPEED = 15
const BOSS_SPEED = 10 // prędkość ścigania bossa
const ROLL_SPEED = 30
const STEP_HEIGHT = 1.5
const MOUSE_SENS = 0.002
const ROLL_DURATION = 0.6
const ROLL_COOLDOWN = 2.0
const INVINCIBILITY_DURATION = 1.0
const ATTACK_COOLDOWN = 0.6 // czas między atakami gracza (s)
const ATTACK_ANGLE = Math.PI / 3 // kąt 60 stopni
const ATTACK_RANGE = 5 // zasięg ataku

// --------------------------- ZMIENNE GŁÓWNE --------------------------- //
let scene, camera, renderer
let player, cameraRig, playerMixer
let boss, bossMixer
let idleAction, walkAction, rollAction, attackAction

let bossHP = 100,
	playerHP = 100
let prevTime = performance.now()
let canAttack = true
let canRoll = true
let isMoving = false
let isRolling = false
let isInvincible = false

let initialPlayerPos = new THREE.Vector3()
let initialBossPos = new THREE.Vector3()

// --- INPUT ---
const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, ShiftLeft: false }
let pointerLocked = false

// --- RAYCASTERY ---
const raycaster = new THREE.Raycaster()
const downVec = new THREE.Vector3(0, -1, 0)
const levelMeshes = []

// --------------------------- INICJALIZACJA --------------------------- //
init()
animate()

function init() {
	// --- SCENA, KAMERA, RENDERER ---
	scene = new THREE.Scene()
	scene.background = new THREE.Color(0x202020)

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.shadowMap.enabled = true
	document.querySelector('.gameplay').appendChild(renderer.domElement)

	// --- GRACZ ---
	player = new THREE.Object3D()
	player.position.set(0, 0, 10)
	scene.add(player)
	initialPlayerPos.copy(player.position)

	// --- RIG KAMERY ---
	cameraRig = new THREE.Object3D()
	cameraRig.position.set(0, CAMERA_UP, 0)
	player.add(cameraRig)
	camera.position.set(0, 0, CAMERA_BACK)
	cameraRig.add(camera)

	// --- MODELE I ANIMACJE ---
	const fbxLoader = new FBXLoader()

	// Gracz
	fbxLoader.load('public/img/eternal-game-assets/player.fbx', model => {
		setupModel(model, player)
		playerMixer = new THREE.AnimationMixer(model)
		loadPlayerAnimations(fbxLoader)
	})

	// Boss
	const fbxBossLoader = new FBXLoader()
	fbxBossLoader.load('public/img/eternal-game-assets/boss.fbx', model => {
		setupModel(model)
		boss = model
		const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
		model.position.copy(player.position.clone().addScaledVector(forward, 15))
		initialBossPos.copy(model.position)
		scene.add(model)
		bossMixer = new THREE.AnimationMixer(model)
		setInterval(bossAutoAttack, 2000)
	})

	// Mapa
	new GLTFLoader().load('public/img/eternal-game-assets/modular_dungeon.glb', gltf => {
		gltf.scene.traverse(c => c.isMesh && (c.castShadow = c.receiveShadow = true) && levelMeshes.push(c))
		scene.add(gltf.scene)
	})

	// Oświetlenie
	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1))
	const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
	dirLight.position.set(-10, 20, -10)
	dirLight.castShadow = true
	scene.add(dirLight)

	// Zdarzenia
	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('keyup', onKeyUp)
	document.body.addEventListener('mousemove', onMouseMove)
	document.body.addEventListener('click', () => pointerLocked || document.body.requestPointerLock())
	window.addEventListener('mousedown', onMouseDown)
	window.addEventListener('resize', onResize)
	document.addEventListener('pointerlockchange', () => (pointerLocked = document.pointerLockElement === document.body))
}

function setupModel(model, parent = scene) {
	model.traverse(c => c.isMesh && (c.castShadow = c.receiveShadow = true))
	model.scale.setScalar(MODEL_SCALE)
	model.position.set(0, -MODEL_DOWN, 0)
	model.rotation.y = Math.PI
	parent.add(model)
}

function loadPlayerAnimations(loader) {
	loader.load(
		'public/img/eternal-game-assets/idle.fbx',
		a => (idleAction = playAction(a, { loop: THREE.LoopRepeat, autoStart: true }))
	)
	loader.load('public/img/eternal-game-assets/walk.fbx', a => (walkAction = playAction(a, { loop: THREE.LoopRepeat })))
	loader.load('public/img/eternal-game-assets/roll.fbx', a => (rollAction = playAction(a, { loop: THREE.LoopOnce })))
	loader.load(
		'public/img/eternal-game-assets/attack.fbx',
		a => (attackAction = playAction(a, { loop: THREE.LoopOnce }))
	)
}

function playAction(anim, { loop, autoStart = false }) {
	const action = playerMixer.clipAction(anim.animations[0])
	action.setLoop(loop)
	action.clampWhenFinished = true
	autoStart && action.play()
	return action
}

// --------------------------- PĘTLA GRY --------------------------- //
function animate() {
	requestAnimationFrame(animate)
	const delta = (performance.now() - prevTime) / 1000
	prevTime = performance.now()
	playerMixer?.update(delta)
	bossMixer?.update(delta)
	updatePlayer(delta)
	updateBoss(delta)
	renderer.render(scene, camera)
}

// --------------------------- STEROWANIE --------------------------- //
function updatePlayer(delta) {
	if (isRolling) return applyRoll(delta)
	const move = new THREE.Vector3(keys.KeyA ? -1 : keys.KeyD ? 1 : 0, 0, keys.KeyW ? -1 : keys.KeyS ? 1 : 0)
	const moving = move.lengthSq() > 0
	if (moving !== isMoving) (isMoving = moving) ? transition(walkAction, idleAction) : transition(idleAction, walkAction)
	if (moving) applyMove(move.normalize(), delta)
	applyGravity()
	clampCamera()
}

function applyRoll(delta) {
	const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
	player.position.addScaledVector(dir, ROLL_SPEED * delta)
}

function applyMove(local, delta) {
	const worldDir = local.applyQuaternion(player.quaternion)
	const origin = player.position.clone().add(new THREE.Vector3(0, STEP_HEIGHT, 0))
	raycaster.set(origin, worldDir)
	const hit = raycaster.intersectObjects(levelMeshes, true)[0]
	const step = MOVE_SPEED * delta
	if (!hit || hit.distance > step + 0.2) player.position.addScaledVector(worldDir, step)
}

function applyGravity() {
	raycaster.set(player.position.clone().add(new THREE.Vector3(0, STEP_HEIGHT * 2, 0)), downVec)
	const ground = raycaster.intersectObjects(levelMeshes, true)[0]
	ground && (player.position.y = ground.point.y + STEP_HEIGHT)
}

function clampCamera() {
	cameraRig.rotation.x = THREE.MathUtils.clamp(cameraRig.rotation.x, -Math.PI / 3, Math.PI / 3)
}

function updateBoss(delta) {
	if (!boss || playerHP <= 0) return
	const dir = player.position.clone().sub(boss.position)
	const dist = dir.length()
	if (dist > 2) {
		dir.normalize()
		boss.position.addScaledVector(dir, BOSS_SPEED * delta)
		boss.lookAt(player.position)
	}
}

function transition(start, end) {
	start.stop()
	end.play()
}

// --------------------------- ZDARZENIA --------------------------- //
function onKeyDown(e) {
	keys[e.code] = true
	if (e.code === 'ShiftLeft' && !isRolling && canRoll) startRoll()
	if (e.code === 'Escape' && pointerLocked) document.exitPointerLock()
}
function onKeyUp(e) {
	keys[e.code] = false
}
function onMouseMove(e) {
	if (!pointerLocked) return
	player.rotation.y -= e.movementX * MOUSE_SENS
	cameraRig.rotation.x -= e.movementY * MOUSE_SENS
}
function onMouseDown(e) {
	e.button === 0 && pointerLocked && !isRolling && attack()
}
function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}

// --------------------------- AKCJE --------------------------- //
function startRoll() {
	if (!canRoll) return
	isRolling = canRoll = true
	isInvincible = true
	rollAction.reset().play()
	setTimeout(() => {
		isRolling = false
		isInvincible = false
		idleAction.play()
	}, ROLL_DURATION * 1000)
	setTimeout(() => (canRoll = true), ROLL_COOLDOWN * 1000)
}

function attack() {
	if (!canAttack || !boss) return
	canAttack = false
	attackAction.reset().play()
	setTimeout(() => {
		// sprawdź zasięg i kąt ataku
		const toBoss = boss.position.clone().sub(player.position)
		const dist = toBoss.length()
		if (dist <= ATTACK_RANGE) {
			const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
			const angle = forward.angleTo(toBoss.normalize())
			if (angle <= ATTACK_ANGLE) {
				bossHP = Math.max(0, bossHP - 25)
				document.getElementById('bossHP').textContent = `Boss HP: ${bossHP}`
				if (bossHP <= 0) return endGame(true)
			}
		}
		// powrót do animacji
		isMoving ? walkAction.play() : idleAction.play()
	}, ATTACK_COOLDOWN * 1000)
	setTimeout(() => (canAttack = true), ATTACK_COOLDOWN * 1000)
}

function bossAutoAttack() {
	if (!boss || playerHP <= 0) return
	if (player.position.distanceTo(boss.position) < 5 && !isInvincible) {
		playerHP = Math.max(0, playerHP - 10)
		document.getElementById('playerHP').textContent = `HP: ${playerHP}`
		if (playerHP <= 0) return endGame(false)
		isInvincible = true
		setTimeout(() => (isInvincible = false), INVINCIBILITY_DURATION * 1000)
	}
}

// --------------------------- RESET GRY --------------------------- //
function endGame(victory) {
	setTimeout(() => {
		alert(victory ? 'Zwycięstwo!' : 'Game Over!')
		resetGame()
	}, 100)
}

function resetGame() {
	player.position.copy(initialPlayerPos)
	boss.position.copy(initialBossPos)
	playerHP = bossHP = 100
	document.getElementById('playerHP').textContent = `HP: ${playerHP}`
	document.getElementById('bossHP').textContent = `Boss HP: ${bossHP}`
	canAttack = true
	canRoll = true
	isRolling = false
	isInvincible = false
	idleAction.play()
}

// --------------------------- UI --------------------------- //
// Upewnij się, że w HTML są elementy #playerHP i #bossHP do aktualizacji

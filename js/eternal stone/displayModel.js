import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvas = document.querySelector('.lore__character-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio)

/* ====== Scena, kamera, światła ====== */
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100) // ★ kamera najpierw
camera.position.set(0, 1.6, 3)

resizeRenderer() // ★ dopiero TERAZ

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)
scene.add(hemiLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(5, 10, 7)
scene.add(dirLight)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/* ====== Ładowanie modelu GLB ====== */
const loader = new GLTFLoader()
loader.load(
	'/img/eternal-models/knight.glb',
	gltf => {
		const model = gltf.scene
		scene.add(model)

		const box = new THREE.Box3().setFromObject(model)
		const size = box.getSize(new THREE.Vector3()).length()
		const center = box.getCenter(new THREE.Vector3())
		model.position.sub(center)
		model.scale.setScalar(1 / size)
	},
	undefined,
	err => console.error('Błąd ładowania knight.glb:', err)
)

/* ====== Pętla animacji ====== */
function animate() {
	requestAnimationFrame(animate)
	controls.update()
	renderer.render(scene, camera)
}
animate()

/* ====== Reakcja na zmianę rozmiaru ====== */
window.addEventListener('resize', resizeRenderer)
function resizeRenderer() {
	const { clientWidth: w, clientHeight: h } = canvas
	renderer.setSize(w, h, false)
	camera.aspect = w / h // camera już istnieje
	camera.updateProjectionMatrix()
}

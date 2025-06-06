import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function createViewer(canvasSel) {
	const canvas = document.querySelector(canvasSel)
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true,
	})
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setClearColor(0x000000, 0)

	const scene = new THREE.Scene()

	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
	camera.position.set(0, 1.5, 1.9)
	const ORBIT_CENTER = new THREE.Vector3(0, 0.8, 0)
	camera.lookAt(ORBIT_CENTER)

	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
	const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
	dirLight.position.set(5, 10, 7)
	scene.add(dirLight)

	const controls = new OrbitControls(camera, canvas)
	controls.enableDamping = true
	controls.enablePan = false
	controls.enableZoom = false
	controls.enabled = false
	controls.target.copy(ORBIT_CENTER)
	controls.update()

	const loader = new GLTFLoader()
	let current = null
	let loadId = 0

	function disposeRecursively(obj) {
		obj.traverse(node => {
			if (node.geometry) node.geometry.dispose()
			if (node.material) {
				Array.isArray(node.material) ? node.material.forEach(m => m.dispose()) : node.material.dispose()
			}
		})
	}

	function fit(model, extraRotY = 0, yOffset = 0) {
		model.rotation.y = -Math.PI / 2 + extraRotY
		model.rotation.z = 0

		const box = new THREE.Box3().setFromObject(model)
		const size = box.getSize(new THREE.Vector3()).length()
		const center = box.getCenter(new THREE.Vector3())

		model.position.sub(center)
		model.scale.setScalar(2 / size)

		box.setFromObject(model)
		model.position.y -= box.min.y + yOffset
	}

	function showModel(path, rotY = 0, yOffset = 0) {
		const thisLoad = ++loadId
		loader.load(path, gltf => {
			if (thisLoad !== loadId) return
			if (current) {
				scene.remove(current)
				disposeRecursively(current)
			}
			current = gltf.scene
			fit(current, rotY, yOffset)
			scene.add(current)
			resize()
		})
	}

	function setInteractive(on) {
		controls.enabled = on
		if (!on) renderer.render(scene, camera)
	}

	function resize() {
		const w = canvas.clientWidth
		const h = canvas.clientHeight
		if (!w || !h) return
		renderer.setSize(w, h, false)
		camera.aspect = w / h
		camera.updateProjectionMatrix()
	}
	window.addEventListener('resize', resize)
	new ResizeObserver(resize).observe(canvas)
	requestAnimationFrame(resize)
	;(function animate() {
		requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	})()

	return {
		show: showModel,
		setInteractive,
	}
}

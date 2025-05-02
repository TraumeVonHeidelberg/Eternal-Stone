import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export function createViewer(canvasSel) {
	const canvas = document.querySelector(canvasSel)
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true, // keep last frame
	})
	renderer.setPixelRatio(window.devicePixelRatio)
	// transparent background
	renderer.setClearColor(0x000000, 0)

	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
	camera.position.set(0, 1.6, 1)

	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
	const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
	dirLight.position.set(5, 10, 7)
	scene.add(dirLight)

	const controls = new OrbitControls(camera, canvas)
	controls.enableDamping = true
	controls.enablePan = false
	controls.enabled = false

	const loader = new GLTFLoader()
	let current = null
	let loadId = 0

	function disposeRecursively(obj) {
		obj.traverse(node => {
			if (node.geometry) node.geometry.dispose()
			if (node.material) {
				if (Array.isArray(node.material)) {
					node.material.forEach(m => m.dispose())
				} else {
					node.material.dispose()
				}
			}
		})
	}

	function fit(model, extraRotY = 0, yOffset = 0) {
		// rotate model so its front faces camera:
		model.rotation.x = -0.5
		model.rotation.y = -Math.PI / 2 + extraRotY
		model.rotation.z = 0
		const box = new THREE.Box3().setFromObject(model)
		const size = box.getSize(new THREE.Vector3()).length()
		const center = box.getCenter(new THREE.Vector3())
		model.position.sub(center)
		model.scale.setScalar(1.9 / size)
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
			// teraz trzecim argumentem jest yOffset
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
		const w = canvas.clientWidth,
			h = canvas.clientHeight
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

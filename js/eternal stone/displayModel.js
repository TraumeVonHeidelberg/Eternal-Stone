import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export function createViewer(canvasSel) {
	const canvas = document.querySelector(canvasSel)
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true, // keep the last frame on screen
	})
	renderer.setPixelRatio(window.devicePixelRatio)
	// make the canvas transparent rather than black
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

	function fit(model, rotY = 0) {
		model.rotation.y = rotY
		const box = new THREE.Box3().setFromObject(model)
		const size = box.getSize(new THREE.Vector3()).length()
		const center = box.getCenter(new THREE.Vector3())
		model.position.sub(center)
		model.scale.setScalar(1 / size)
		box.setFromObject(model)
		model.position.y -= box.min.y
	}

	function showModel(path, rotY = 0) {
		const thisLoad = ++loadId
		// do NOT remove the old model yet – wait until the new one is ready
		loader.load(path, gltf => {
			if (thisLoad !== loadId) return
			// now swap out
			if (current) {
				scene.remove(current)
				disposeRecursively(current)
			}
			current = gltf.scene
			fit(current, rotY)
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

const API_URL = '/api/typing'

let currentText = ''
let startTime = null
let timerInterval = null
let isTestActive = false
let currentCharIndex = 0

const startBtn = document.getElementById('startBtn')
const statsBtn = document.getElementById('statsBtn')
const clearBtn = document.getElementById('clearBtn')
const textDisplay = document.getElementById('textDisplay')
const inputArea = document.getElementById('inputArea')
const typingArea = document.getElementById('typingArea')
const timer = document.getElementById('timer')
const currentStats = document.getElementById('currentStats')
const resultsSection = document.getElementById('resultsSection')
const resultModal = document.getElementById('resultModal')
const closeModelBtn=document.getElementById('closeModal')

startBtn.addEventListener('click', startTest)
statsBtn.addEventListener('click', toggleStats)
clearBtn.addEventListener('click', clearHistory)
inputArea.addEventListener('input', handleInput)
inputArea.addEventListener('keydown', handleKeydown)
closeModelBtn.addEventListener('click',closeModal)

async function startTest() {
	if (isTestActive) return

	// Reset
	currentCharIndex = 0
	inputArea.value = ''
	inputArea.disabled = false
	isTestActive = true
	startBtn.disabled = true

	// Get text
	try {
		const response = await fetch(`${API_URL}/get-text?lang=en`)
		const data = await response.json()
		currentText = data.text
	} catch (error) {
		console.error('Error fetching text:', error)
		alert('Failed to load text. Please try again.')
		resetTest()
		return
	}

	displayText()

	typingArea.classList.remove('hidden')
	timer.classList.remove('hidden')
	currentStats.classList.add('hidden')

	inputArea.focus()
}

function displayText() {
	textDisplay.innerHTML = ''
	for (let i = 0; i < currentText.length; i++) {
		const span = document.createElement('span')
		span.className = 'char'
		span.textContent = currentText[i]
		if (i === 0) span.classList.add('current')
		textDisplay.appendChild(span)
	}
}

function handleInput(e) {
	if (!isTestActive) return

	if (!startTime) {
		startTime = Date.now()
		startTimer()
	}

	const typedText = e.target.value
	const chars = textDisplay.querySelectorAll('.char')

	for (let i = 0; i < currentText.length; i++) {
		if (i < typedText.length) {
			if (typedText[i] === currentText[i]) {
				chars[i].classList.add('correct')
				chars[i].classList.remove('incorrect', 'current')
			} else {
				chars[i].classList.add('incorrect')
				chars[i].classList.remove('correct', 'current')
			}
		} else {
			chars[i].classList.remove('correct', 'incorrect', 'current')
			if (i === typedText.length) {
				chars[i].classList.add('current')
			}
		}
	}

	currentCharIndex = typedText.length

	if (typedText.length === currentText.length) {
		endTest()
	}
}

function handleKeydown(e) {
	if (!isTestActive) return

	if (e.key === 'Backspace' && currentCharIndex === 0) {
		e.preventDefault()
	}
}

function startTimer() {
	timerInterval = setInterval(() => {
		const elapsed = (Date.now() - startTime) / 1000
		timer.textContent = `${elapsed.toFixed(1)}s`
	}, 100)
}

async function endTest() {
	isTestActive = false
	clearInterval(timerInterval)

	const endTime = Date.now()
	const timeInSeconds = (endTime - startTime) / 1000
	const typedText = inputArea.value

	try {
		const response = await fetch(`${API_URL}/submit-result`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				originalText: currentText,
				typedText: typedText,
				time: timeInSeconds,
			}),
		})

		const result = await response.json()
		showResults(result)
	} catch (error) {
		console.error('Error submitting result:', error)
		alert('Failed to save result. Please try again.')
	}

	resetTest()
}

function resetTest() {
	startBtn.disabled = false
	inputArea.disabled = true
	startTime = null
	isTestActive = false
}

function showResults(result) {

	document.getElementById('timeValue').textContent = `${result.time.toFixed(1)}s`
	document.getElementById('wpmValue').textContent = result.wpm
	document.getElementById('cpmValue').textContent = result.cpm
	document.getElementById('accuracyValue').textContent = `${result.accuracy}%`
	document.getElementById('errorsValue').textContent = result.errors

	currentStats.classList.remove('hidden')

	document.getElementById('modalTime').textContent = `${result.time.toFixed(1)}s`
	document.getElementById('modalWpm').textContent = result.wpm
	document.getElementById('modalAccuracy').textContent = `${result.accuracy}%`

	resultModal.classList.add('show')
}

function closeModal() {
	resultModal.classList.remove('show')
}

async function toggleStats() {
	if (resultsSection.classList.contains('hidden')) {
		await loadResults()
		resultsSection.classList.remove('hidden')
		statsBtn.textContent = 'Hide Statistics'
	} else {
		resultsSection.classList.add('hidden')
		statsBtn.textContent = 'Show Statistics'
	}
}

async function loadResults() {
	try {
		const [resultsResponse, statsResponse] = await Promise.all([
			fetch(`${API_URL}/results`),
			fetch(`${API_URL}/statistics`),
		])

		const results = await resultsResponse.json()
		const stats = await statsResponse.json()

		const container = document.getElementById('resultsContainer')
		container.innerHTML = ''

		// Show overall statistics
		if (stats.totalTests > 0) {
			const statsDiv = document.createElement('div')
			statsDiv.className = 'typing-test__result-card typing-test__result-card--summary'
			statsDiv.innerHTML = `
                <div>
                    <strong>Overall Statistics</strong><br>
                    Total tests: ${stats.totalTests}
                </div>
                <div style="text-align: right">
                    Average WPM: ${stats.averageWpm}<br>
                    Average accuracy: ${stats.averageAccuracy}%
                </div>
            `
			container.appendChild(statsDiv)
		}

		// Show recent results
		results
			.slice(-10)
			.reverse()
			.forEach(result => {
				const div = document.createElement('div')
				div.className = 'typing-test__result-card'
				const date = new Date(result.timestamp).toLocaleString()
				div.innerHTML = `
                <div>
                    <strong>${date}</strong><br>
                    Time: ${result.time.toFixed(1)}s
                </div>
                <div style="text-align: right">
                    WPM: ${result.wpm} | Accuracy: ${result.accuracy}%<br>
                    CPM: ${result.cpm} | Errors: ${result.errors}
                </div>
            `
				container.appendChild(div)
			})

		if (results.length === 0) {
			container.innerHTML = '<div class="typing-test__result-card">No test results yet. Start typing!</div>'
		}
	} catch (error) {
		console.error('Error loading results:', error)
	}
}

async function clearHistory() {
	if (confirm('Are you sure you want to clear all history?')) {
		try {
			await fetch(`${API_URL}/clear-history`, { method: 'POST' })
			alert('History cleared successfully')
			if (!resultsSection.classList.contains('hidden')) {
				loadResults()
			}
		} catch (error) {
			console.error('Error clearing history:', error)
			alert('Failed to clear history')
		}
	}
}


window.onclick = function (event) {
	if (event.target == resultModal) {
		closeModal()
	}
}

window.closeModal = closeModal

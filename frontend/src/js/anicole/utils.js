export function getQuery(name) {
	return new URLSearchParams(window.location.search).get(name)
}

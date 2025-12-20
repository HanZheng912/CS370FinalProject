/**
 * Real function to get place suggestions from backend
 * while keeping the same behavior: delay + 5-8 results.
 * @param {string} query - Search query string
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function getPlaceSuggestions(query) {
  if (typeof query !== 'string' || query.trim().length < 3) return []

  const delay = Math.floor(Math.random() * 151) + 150
  await new Promise(resolve => setTimeout(resolve, delay))

  const queryTrimmed = query.trim()

 const res = await fetch(`https://cs370finalproject-2.onrender.com/api/places/suggest?q=${encodeURIComponent(query)}`, {
  headers: { Accept: 'application/json' }
})


  if (!res.ok) return []

  const data = await res.json()
  const suggestionsFromApi = Array.isArray(data)
    ? data
    : (data.suggestions ?? [])

  if (suggestionsFromApi.length > 0) {
    const count = Math.min(
      Math.floor(Math.random() * 4) + 5,
      suggestionsFromApi.length
    )
    return suggestionsFromApi.slice(0, count)
  }

  return []
}



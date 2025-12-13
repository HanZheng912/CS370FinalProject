// Mock NYC-style addresses for place suggestions
const MOCK_ADDRESSES = [
  { id: 'mock-1', label: '123 Main St, Queens, NY' },
  { id: 'mock-2', label: '456 Broadway, Manhattan, NY' },
  { id: 'mock-3', label: '789 Queens Blvd, Queens, NY' },
  { id: 'mock-4', label: '321 Park Ave, Brooklyn, NY' },
  { id: 'mock-5', label: '654 Lexington Ave, Manhattan, NY' },
  { id: 'mock-6', label: '987 5th Ave, Manhattan, NY' },
  { id: 'mock-7', label: '147 Madison Ave, Manhattan, NY' },
  { id: 'mock-8', label: '258 Flatbush Ave, Brooklyn, NY' },
  { id: 'mock-9', label: '369 Atlantic Ave, Brooklyn, NY' },
  { id: 'mock-10', label: '741 Roosevelt Ave, Queens, NY' },
  { id: 'mock-11', label: '852 Northern Blvd, Queens, NY' },
  { id: 'mock-12', label: '963 Grand Concourse, Bronx, NY' },
  { id: 'mock-13', label: '159 Fordham Rd, Bronx, NY' },
  { id: 'mock-14', label: '357 Hylan Blvd, Staten Island, NY' },
  { id: 'mock-15', label: '468 Steinway St, Queens, NY' }
]

/**
 * Mock function to get place suggestions
 * @param {string} query - Search query string
 * @returns {Promise<Array<{id: string, label: string}>>} Array of place suggestions
 */
export async function getPlaceSuggestions(query) {
  // Return empty array if query is invalid
  if (typeof query !== 'string' || query.trim().length < 3) {
    return []
  }

  // Simulate API delay (150-300ms)
  const delay = Math.floor(Math.random() * 151) + 150 // 150-300ms
  await new Promise(resolve => setTimeout(resolve, delay))

  // Filter addresses that match the query (case-insensitive)
  const queryLower = query.trim().toLowerCase()
  const matchingAddresses = MOCK_ADDRESSES.filter(address =>
    address.label.toLowerCase().includes(queryLower)
  )

  // If we have matches, return 5-8 of them (or all if less than 5)
  if (matchingAddresses.length > 0) {
    const count = Math.min(
      Math.floor(Math.random() * 4) + 5, // 5-8 items
      matchingAddresses.length
    )
    return matchingAddresses.slice(0, count)
  }

  // If no matches, return empty array
  return []
}


/**
 * Mock API function to estimate departure time based on trip details
 * @param {Object} payload - Trip details payload
 * @param {string} payload.fromAddressText - Starting address text
 * @param {string|null} payload.selectedPlaceId - Selected place ID (if from autocomplete)
 * @param {string} payload.airport - Airport code ("JFK" | "LGA" | "EWR")
 * @param {string} payload.arrivalDate - Arrival date in "MM-DD-YYYY" format
 * @param {string} payload.arrivalTime - Arrival time in "HH:MM" format
 * @param {string} payload.transportMode - Transportation mode ("self" | "cab")
 * @param {number} payload.cabBufferMinutes - Cab pickup buffer in minutes (0 if self-driving)
 * @param {string} payload.weatherCondition - Weather condition ("Clear" | "Light rain" | "Heavy rain" | "Snow or ice" | "Severe weather")
 * @returns {Promise<Object>} Departure estimate with recommended time and breakdown
 * @throws {Error} If required fields are missing or invalid
 */
export async function estimateDeparture(payload) {
  if (!payload) throw new Error('Payload is required')

  // BULLETPROOF: accept both fromAddressText and fromAddress
  const normalized = {
    ...payload,
    fromAddressText: (payload.fromAddressText ?? payload.fromAddress ?? '').toString()
  }

  const {
    fromAddressText,
    selectedPlaceId,
    airport,
    arrivalDate,
    arrivalTime,
    transportMode,
    cabBufferMinutes,
    weatherCondition
  } = normalized

  // Validate required fields
  if (!fromAddressText || fromAddressText.trim() === '') {
    throw new Error('fromAddressText is required and must be a non-empty string')
  }
  if (!airport || !['JFK', 'LGA', 'EWR'].includes(airport)) {
    throw new Error('airport is required and must be "JFK", "LGA", or "EWR"')
  }

  if (!arrivalDate || typeof arrivalDate !== 'string') {
    throw new Error('arrivalDate is required and must be a string in "MM-DD-YYYY" format')
  }

  if (!arrivalTime || typeof arrivalTime !== 'string') {
    throw new Error('arrivalTime is required and must be a string in "HH:MM" format')
  }

  if (!transportMode || !['self', 'cab'].includes(transportMode)) {
    throw new Error('transportMode is required and must be "self" or "cab"')
  }

  if (typeof cabBufferMinutes !== 'number' || cabBufferMinutes < 0) {
    throw new Error('cabBufferMinutes is required and must be a non-negative number')
  }

  if (!weatherCondition || !['Clear', 'Light rain', 'Heavy rain', 'Snow or ice', 'Severe weather'].includes(weatherCondition)) {
    throw new Error(
      'weatherCondition is required and must be one of: "Clear", "Light rain", "Heavy rain", "Snow or ice", "Severe weather"'
    )
  }

  // Simulate network delay (600-1200ms)  <-- keep if you want, or remove later
  const delay = Math.floor(Math.random() * 601) + 600 // 600-1200ms
  await new Promise(resolve => setTimeout(resolve, delay))

  // Include cab buffer if transport mode is "cab", otherwise use 0
  const cabBufferMinutesUsed = transportMode === 'cab' ? cabBufferMinutes : 0

  // Compute weather extra minutes
  const weatherExtraMinutesMap = {
    Clear: 0,
    'Light rain': 5,
    'Heavy rain': 12,
    'Snow or ice': 18,
    'Severe weather': 25
  }
  const weatherExtraMinutes = weatherExtraMinutesMap[weatherCondition] || 0

  // Parse arrival date and time (same as your code)
  const [month, day, year] = arrivalDate.split('-').map(Number)
  const [hours, minutes] = arrivalTime.split(':').map(Number)

  if (isNaN(month) || isNaN(day) || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid date or time format')
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid date or time values')
  }

  const arrivalDateTime = new Date(year, month - 1, day, hours, minutes)
  if (isNaN(arrivalDateTime.getTime())) {
    throw new Error('Invalid date/time combination')
  }

  /**
   * NEW: baseTravelMinutes from backend (Google Routes/Distance Matrix)
   * We ask backend for the traffic-aware base travel minutes.
   *
   * The backend should return something like:
   * { baseTravelMinutes: 47 }
   */
   const baseTravelMinutes = await fetchBaseTravelMinutes(normalized)


  // Compute total minutes (same shape as before)
  const totalMinutes = baseTravelMinutes + cabBufferMinutesUsed + weatherExtraMinutes

  // Subtract total minutes from arrival date to compute recommended leave date/time
  const recommendedLeaveDateTime = new Date(arrivalDateTime.getTime() - totalMinutes * 60 * 1000)

  const formatDateTime = (date) => date.toISOString()

  return {
    recommendedLeaveDateTime: formatDateTime(recommendedLeaveDateTime),
    arrivalDateTime: formatDateTime(arrivalDateTime),
    breakdown: {
      baseTravelMinutes,
      cabBufferMinutes: cabBufferMinutesUsed,
      weatherExtraMinutes,
      totalMinutes
    }
  }
}

/**
 * Calls your backend to get a real baseTravelMinutes from Google APIs.
 * Backend should NOT expose the Google API key to the browser.
 */
async function fetchBaseTravelMinutes(payload) {
  const fromAddressText = (payload.fromAddressText ?? payload.fromAddress ?? '').toString()

  const res = await fetch('/api/trip/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromAddressText,
      selectedPlaceId: payload.selectedPlaceId ?? null,
      airport: payload.airport,
      arrivalDate: payload.arrivalDate,
      arrivalTime: payload.arrivalTime,
      transportMode: payload.transportMode,
      cabBufferMinutes: Number(payload.cabBufferMinutes) || 0,
      weatherCondition: payload.weatherCondition
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Estimate failed (${res.status})`)

  const n = Number(data?.breakdown?.baseTravelMinutes)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Backend returned invalid baseTravelMinutes')
  return Math.round(n)
}



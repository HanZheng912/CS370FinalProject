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
  // Validate required fields
  if (!payload) {
    throw new Error('Payload is required')
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
  } = payload

  // Validate required fields
  if (!fromAddressText || typeof fromAddressText !== 'string' || fromAddressText.trim() === '') {
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
    throw new Error('weatherCondition is required and must be one of: "Clear", "Light rain", "Heavy rain", "Snow or ice", "Severe weather"')
  }

  // Simulate network delay (600-1200ms)
  const delay = Math.floor(Math.random() * 601) + 600 // 600-1200ms
  await new Promise(resolve => setTimeout(resolve, delay))

  // Compute base travel minutes by airport
  const baseTravelMinutesMap = {
    JFK: 45,
    LGA: 35,
    EWR: 55
  }
  const baseTravelMinutes = baseTravelMinutesMap[airport]

  // Include cab buffer if transport mode is "cab", otherwise use 0
  const cabBufferMinutesUsed = transportMode === 'cab' ? cabBufferMinutes : 0

  // Compute weather extra minutes
  const weatherExtraMinutesMap = {
    'Clear': 0,
    'Light rain': 5,
    'Heavy rain': 12,
    'Snow or ice': 18,
    'Severe weather': 25
  }
  const weatherExtraMinutes = weatherExtraMinutesMap[weatherCondition] || 0

  // Compute total minutes
  const totalMinutes = baseTravelMinutes + cabBufferMinutesUsed + weatherExtraMinutes

  // Parse arrival date and time
  // arrivalDate format: "MM-DD-YYYY"
  // arrivalTime format: "HH:MM"
  const [month, day, year] = arrivalDate.split('-').map(Number)
  const [hours, minutes] = arrivalTime.split(':').map(Number)

  // Validate parsed date/time
  if (isNaN(month) || isNaN(day) || isNaN(year) || isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid date or time format')
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid date or time values')
  }

  // Create arrival Date object (month is 0-indexed in JavaScript Date)
  const arrivalDateTime = new Date(year, month - 1, day, hours, minutes)

  // Validate the date object
  if (isNaN(arrivalDateTime.getTime())) {
    throw new Error('Invalid date/time combination')
  }

  // Subtract total minutes from arrival date to compute recommended leave date/time
  const recommendedLeaveDateTime = new Date(arrivalDateTime.getTime() - totalMinutes * 60 * 1000)

  // Format dates as ISO strings
  const formatDateTime = (date) => {
    return date.toISOString()
  }

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


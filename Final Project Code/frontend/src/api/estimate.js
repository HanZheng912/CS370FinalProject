// Always use production backend (can be overridden with VITE_BACKEND_BASE_URL env var)
const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || 'https://cs370finalproject-2.onrender.com'

function apiUrl(path) {
  return `${API_BASE}${path}`
}

export async function estimateDeparture(payload) {
  if (!payload) throw new Error('Payload is required')

  const normalized = {
    ...payload,
    fromAddressText: (payload.fromAddressText ?? payload.fromAddress ?? '').toString()
  }

  const {
    fromAddressText,
    airport,
    arrivalDate,
    arrivalTime,
    transportMode,
    cabBufferMinutes
  } = normalized

  if (!fromAddressText || fromAddressText.trim() === '') throw new Error('fromAddressText is required')
  if (!airport || !['JFK', 'LGA', 'EWR'].includes(airport)) throw new Error('airport must be JFK, LGA, or EWR')
  if (!arrivalDate || typeof arrivalDate !== 'string') throw new Error('arrivalDate is required')
  if (!arrivalTime || typeof arrivalTime !== 'string') throw new Error('arrivalTime is required')
  if (!transportMode || !['self', 'cab'].includes(transportMode)) throw new Error('transportMode must be self or cab')
  if (typeof cabBufferMinutes !== 'number' || cabBufferMinutes < 0) throw new Error('cabBufferMinutes must be >= 0')

  const est = await fetchTripEstimate(normalized)

  const cabBufferMinutesUsed = transportMode === 'cab' ? cabBufferMinutes : 0
  const baseTravelMinutes = est.baseTravelMinutes
  const weatherExtraMinutes = est.weatherExtraMinutes

  const totalMinutes = baseTravelMinutes + cabBufferMinutesUsed + weatherExtraMinutes

  return {
    recommendedLeaveDateTime: est.recommendedLeaveDateTime,
    arrivalDateTime: est.arrivalDateTime,
    breakdown: {
      baseTravelMinutes,
      cabBufferMinutes: cabBufferMinutesUsed,
      weatherExtraMinutes,
      totalMinutes,
      weatherSummary: est.weatherSummary || null
    }
  }
}

async function fetchTripEstimate(payload) {
  const res = await fetch(apiUrl('/api/trip/estimate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromAddressText: payload.fromAddressText,
      selectedPlaceId: payload.selectedPlaceId ?? null,
      airport: payload.airport,
      arrivalDate: payload.arrivalDate,
      arrivalTime: payload.arrivalTime,
      transportMode: payload.transportMode,
      cabBufferMinutes: Number(payload.cabBufferMinutes) || 0,

      // ✅ bulletproof: always use Weather API in backend
      useWeatherApi: true
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Estimate failed (${res.status})`)

  const base = Number(data?.breakdown?.baseTravelMinutes)
  const wx = Number(data?.breakdown?.weatherExtraMinutes)

  return {
    recommendedLeaveDateTime: data?.recommendedLeaveDateTime || null,
    arrivalDateTime: data?.arrivalDateTime || null,
    baseTravelMinutes: Number.isFinite(base) ? Math.round(base) : 0,
    weatherExtraMinutes: Number.isFinite(wx) ? Math.round(wx) : 0,
    weatherSummary: data?.breakdown?.weatherSummary || 'Weather unavailable'
  }
}

/**
 * Weather preview used by TripForm while typing date/time.
 * Does NOT require fromAddressText.
 */
export async function fetchWeatherPreview({ airport, arrivalDate, arrivalTime }) {
  const res = await fetch(apiUrl('/api/trip/estimate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      previewWeather: true,
      airport,
      arrivalDate,
      arrivalTime
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Weather preview failed (${res.status})`)

  return {
    weatherSummary: data?.breakdown?.weatherSummary || 'Weather unavailable',
    weatherExtraMinutes: Number(data?.breakdown?.weatherExtraMinutes) || 0
  }
}

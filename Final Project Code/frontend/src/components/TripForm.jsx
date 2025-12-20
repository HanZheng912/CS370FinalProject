import { useEffect, useRef, useState } from 'react'
import { validateTripForm } from '../utils/validation'
import { getPlaceSuggestions } from '../api/places'
import { fetchWeatherPreview } from '../api/estimate'

// ✅ keep helpers OUTSIDE hooks/handlers
const convertDateToMMDDYYYY = (dateString) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${month}-${day}-${year}`
}

function TripForm({ onCalculate, isLoading = false, onResetFields }) {
  // ---- form state ----
  const [fromAddress, setFromAddress] = useState('')
  const [airport, setAirport] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [cabBuffer, setCabBuffer] = useState('10')

  // ---- auto weather preview ----
  const [weatherCondition, setWeatherCondition] = useState('')
  const [weatherExtraMinutes, setWeatherExtraMinutes] = useState(0)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // ---- validation + autocomplete ----
  const [errors, setErrors] = useState({})
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)

  const addressInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const isSelectingSuggestionRef = useRef(false)

  // ✅ Reset form fields except fromAddress and airport when onResetFields changes
  useEffect(() => {
    if (!onResetFields) return

    setArrivalDate('')
    setArrivalTime('')
    setTransportMode('')
    setCabBuffer('10')

    setWeatherCondition('')
    setWeatherExtraMinutes(0)
    setWeatherLoading(false)

    setErrors({})
    setSelectedPlace(null)
    setAddressSuggestions([])
    setIsSuggestionsOpen(false)
    setIsSuggestionsLoading(false)
  }, [onResetFields])

  // ✅ Address suggestions fetch (debounced)
  useEffect(() => {
    // clear selected place if user edits input (but not when selecting from dropdown)
    if (!isSelectingSuggestionRef.current) {
      setSelectedPlace(null)
    }
    isSelectingSuggestionRef.current = false

    const q = fromAddress.trim()
    if (q.length < 3) {
      setAddressSuggestions([])
      setIsSuggestionsOpen(false)
      setIsSuggestionsLoading(false)
      return
    }

    setIsSuggestionsOpen(true)

    const timeoutId = setTimeout(async () => {
      setIsSuggestionsLoading(true)
      try {
        const suggestions = await getPlaceSuggestions(q)
        setAddressSuggestions(Array.isArray(suggestions) ? suggestions : [])
        setIsSuggestionsOpen(true)
      } catch (e) {
        setAddressSuggestions([])
        setIsSuggestionsOpen(false)
      } finally {
        setIsSuggestionsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fromAddress])

  // ✅ Close suggestions when clicking outside
  useEffect(() => {
    if (!isSuggestionsOpen) return

    const handleClickOutside = (event) => {
      const isClickOnInput =
        addressInputRef.current &&
        (addressInputRef.current === event.target ||
          addressInputRef.current.contains(event.target))

      const isClickOnSuggestions =
        suggestionsRef.current && suggestionsRef.current.contains(event.target)

      if (!isClickOnInput && !isClickOnSuggestions) {
        setIsSuggestionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSuggestionsOpen])

  // ✅ Close dropdown on Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isSuggestionsOpen) setIsSuggestionsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isSuggestionsOpen])

  // ✅ Auto weather preview (debounced)
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!airport || !arrivalDate || !arrivalTime) {
        setWeatherCondition('')
        setWeatherExtraMinutes(0)
        return
      }

      setWeatherLoading(true)
      try {
        const wx = await fetchWeatherPreview({
          airport,
          arrivalDate: convertDateToMMDDYYYY(arrivalDate),
          arrivalTime
        })

        if (cancelled) return

        const summary = wx?.weatherCondition || wx?.weatherSummary || ''
        const extra = Number(wx?.weatherExtraMinutes) || 0

        setWeatherCondition(summary)
        setWeatherExtraMinutes(extra)

        // clear any old validation error once auto-weather is set
        setErrors((prev) => {
          const next = { ...prev }
          delete next.weatherCondition
          return next
        })
      } catch (e) {
        if (cancelled) return
        setWeatherCondition('')
        setWeatherExtraMinutes(0)
      } finally {
        if (!cancelled) setWeatherLoading(false)
      }
    }

    const t = setTimeout(run, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [airport, arrivalDate, arrivalTime])

  const handleAddressChange = (e) => {
    setFromAddress(e.target.value)
  }

  const handleSuggestionSelect = (suggestion) => {
    isSelectingSuggestionRef.current = true
    setSelectedPlace(suggestion)
    setFromAddress(suggestion.label)
    setIsSuggestionsOpen(false)
    setAddressSuggestions([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isLoading) return

    // ✅ validate using auto weatherCondition (read-only)
    const formValues = {
      fromAddress,
      airport,
      arrivalDate,
      arrivalTime,
      transportMode,
      cabBuffer,
      weatherCondition
    }

    const { isValid, errors: validationErrors } = validateTripForm(formValues)
    if (!isValid) {
      setErrors(validationErrors)
      return
    }

    setErrors({})

    const apiFormValues = {
      fromAddressText: fromAddress,
      selectedPlaceId: selectedPlace?.place_id ?? selectedPlace?.id ?? null,

      airport,
      arrivalDate: convertDateToMMDDYYYY(arrivalDate),
      arrivalTime,

      transportMode: transportMode === 'drive' ? 'self' : transportMode,
      cabBufferMinutes: transportMode === 'cab' ? Number(cabBuffer) : 0,

      // keep sending, but backend will ignore when useWeatherApi=true
      weatherCondition,

      // ✅ tell backend to compute weather
      useWeatherApi: true
    }

    onCalculate?.(apiFormValues)
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
      <h2 className="text-2xl font-semibold text-white mb-6 drop-shadow-md text-center">
        Trip Details
      </h2>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* From address */}
        <div className="relative">
          <label
            htmlFor="fromAddress"
            className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm"
          >
            From address
          </label>
          <input
            ref={addressInputRef}
            type="text"
            id="fromAddress"
            name="fromAddress"
            value={fromAddress}
            onChange={handleAddressChange}
            onFocus={() => {
              if (fromAddress.trim().length >= 3) setIsSuggestionsOpen(true)
            }}
            placeholder="Enter your starting address"
            className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
              errors.fromAddress ? 'border-red-400' : 'border-white/30'
            }`}
            autoComplete="off"
          />
          {errors.fromAddress && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.fromAddress}</p>
          )}

          {/* Suggestions dropdown */}
          {isSuggestionsOpen && fromAddress.trim().length >= 3 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-md border border-white/30 rounded-lg shadow-2xl max-h-60 overflow-auto"
            >
              {isSuggestionsLoading ? (
                <div className="px-4 py-2 text-sm text-gray-700">Loading suggestions...</div>
              ) : addressSuggestions.length > 0 ? (
                addressSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id ?? `${suggestion.label}-${index}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSuggestionSelect(suggestion)
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-blue-100 focus:bg-blue-100 focus:outline-none transition-colors"
                  >
                    {suggestion.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-600">No results</div>
              )}
            </div>
          )}
        </div>

        {/* Airport */}
        <div>
          <label htmlFor="airport" className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
            Airport
          </label>
          <select
            id="airport"
            name="airport"
            value={airport}
            onChange={(e) => setAirport(e.target.value)}
            className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
              errors.airport ? 'border-red-400' : 'border-white/30'
            }`}
          >
            <option value="" className="bg-gray-800 text-white">Select an airport</option>
            <option value="JFK" className="bg-gray-800 text-white">JFK</option>
            <option value="LGA" className="bg-gray-800 text-white">LGA</option>
            <option value="EWR" className="bg-gray-800 text-white">EWR</option>
          </select>
          {errors.airport && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.airport}</p>
          )}
        </div>

        {/* Desired arrival date */}
        <div>
          <label htmlFor="arrivalDate" className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
            Desired arrival date
          </label>
          <input
            type="date"
            id="arrivalDate"
            name="arrivalDate"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
              errors.arrivalDate ? 'border-red-400' : 'border-white/30'
            }`}
          />
          {errors.arrivalDate && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.arrivalDate}</p>
          )}
        </div>

        {/* Desired arrival time */}
        <div>
          <label htmlFor="arrivalTime" className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
            Desired arrival time
          </label>
          <input
            type="time"
            id="arrivalTime"
            name="arrivalTime"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
              errors.arrivalTime ? 'border-red-400' : 'border-white/30'
            }`}
          />
          {errors.arrivalTime && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.arrivalTime}</p>
          )}
        </div>

        {/* Transportation */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
            Transportation
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="transportDrive"
                name="transportation"
                value="drive"
                checked={transportMode === 'drive'}
                onChange={(e) => setTransportMode(e.target.value)}
                className="h-4 w-4 text-blue-400 focus:ring-blue-400 border-white/30 bg-white/10"
              />
              <label htmlFor="transportDrive" className="ml-2 text-sm text-white/90 drop-shadow-sm">
                I am driving myself
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="radio"
                id="transportCab"
                name="transportation"
                value="cab"
                checked={transportMode === 'cab'}
                onChange={(e) => setTransportMode(e.target.value)}
                className="h-4 w-4 text-blue-400 focus:ring-blue-400 border-white/30 bg-white/10"
              />
              <label htmlFor="transportCab" className="ml-2 text-sm text-white/90 drop-shadow-sm">
                I am taking a cab or rideshare
              </label>
            </div>
          </div>

          {errors.transportMode && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.transportMode}</p>
          )}

          {transportMode === 'cab' && (
            <div className="mt-4 ml-6">
              <label htmlFor="cabBuffer" className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
                Cab pickup buffer (minutes)
              </label>
              <input
                type="number"
                id="cabBuffer"
                name="cabBuffer"
                min="1"
                max="60"
                step="1"
                value={cabBuffer}
                onChange={(e) => setCabBuffer(e.target.value)}
                className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all ${
                  errors.cabBuffer ? 'border-red-400' : 'border-white/30'
                }`}
              />
              {errors.cabBuffer && (
                <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.cabBuffer}</p>
              )}
              <p className="mt-2 text-xs text-white/70 italic drop-shadow-sm">
                Please enter how long it usually takes for a cab to arrive in your area.
              </p>
            </div>
          )}
        </div>

        {/* Weather condition (auto) */}
        <div>
          <label htmlFor="weather" className="block text-sm font-medium text-white/90 mb-2 drop-shadow-sm">
            Weather at arrival time
          </label>

          <input
            id="weather"
            name="weather"
            value={weatherLoading ? 'Checking weather...' : (weatherCondition || '—')}
            readOnly
            className={`w-full px-4 py-2.5 bg-white/20 backdrop-blur-sm border rounded-lg text-white focus:outline-none ${
              errors.weatherCondition ? 'border-red-400' : 'border-white/30'
            }`}
          />

          <p className="mt-2 text-xs text-white/70 italic drop-shadow-sm">
            {weatherCondition
              ? `Weather delay added: ${weatherExtraMinutes} min`
              : 'Pick an arrival date/time to see the weather.'}
          </p>

          {errors.weatherCondition && (
            <p className="mt-1 text-sm text-red-300 drop-shadow-sm">{errors.weatherCondition}</p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full md:w-auto px-8 py-3 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all shadow-lg ${
              isLoading
                ? 'bg-white/20 cursor-not-allowed backdrop-blur-sm border border-white/30'
                : 'bg-blue-500/80 hover:bg-blue-500 backdrop-blur-sm border border-blue-400/50 hover:border-blue-300 hover:shadow-xl hover:scale-105'
            }`}
          >
            {isLoading ? 'Calculating…' : 'Calculate time to leave'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TripForm

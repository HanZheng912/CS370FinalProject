import { useState, useEffect, useRef } from 'react'
import { validateTripForm } from '../utils/validation'
import { getPlaceSuggestions } from '../api/places'

function TripForm({ onCalculate }) {
  const [fromAddress, setFromAddress] = useState('')
  const [airport, setAirport] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [cabBuffer, setCabBuffer] = useState('10')
  const [weatherCondition, setWeatherCondition] = useState('')
  const [errors, setErrors] = useState({})
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const addressInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    
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
    
    // Convert date format from YYYY-MM-DD to MM-DD-YYYY
    const convertDateToMMDDYYYY = (dateString) => {
      const [year, month, day] = dateString.split('-')
      return `${month}-${day}-${year}`
    }

    // Map weather condition from form value to API format
    const mapWeatherCondition = (value) => {
      const weatherMap = {
        'clear': 'Clear',
        'light-rain': 'Light rain',
        'heavy-rain': 'Heavy rain',
        'snow-ice': 'Snow or ice',
        'severe': 'Severe weather'
      }
      return weatherMap[value] || value
    }

    // Prepare form values for API call
    const apiFormValues = {
      fromAddress,
      selectedPlaceId: selectedPlace?.id || null,
      airport,
      arrivalDate: convertDateToMMDDYYYY(arrivalDate),
      arrivalTime,
      transportMode,
      cabBuffer,
      weatherCondition: mapWeatherCondition(weatherCondition)
    }

    if (onCalculate) {
      onCalculate(apiFormValues)
    }
  }

  const isFormValid = () => {
    const formValues = {
      fromAddress,
      airport,
      arrivalDate,
      arrivalTime,
      transportMode,
      cabBuffer,
      weatherCondition
    }
    const { isValid } = validateTripForm(formValues)
    return isValid
  }

  // Fetch address suggestions as user types
  useEffect(() => {
    // Clear selectedPlace when fromAddress changes
    setSelectedPlace(null)
    
    // Open dropdown when user types
    if (fromAddress.trim().length >= 3) {
      setIsSuggestionsOpen(true)
    }

    const fetchSuggestions = async () => {
      if (fromAddress.trim().length < 3) {
        setAddressSuggestions([])
        setIsSuggestionsOpen(false)
        setIsSuggestionsLoading(false)
        return
      }

      setIsSuggestionsLoading(true)
      try {
        const suggestions = await getPlaceSuggestions(fromAddress)
        setAddressSuggestions(suggestions)
        // Keep dropdown open to show results or "No results" message
        setIsSuggestionsOpen(true)
      } catch (error) {
        setAddressSuggestions([])
        setIsSuggestionsOpen(false)
      } finally {
        setIsSuggestionsLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300) // Debounce 300ms
    return () => clearTimeout(timeoutId)
  }, [fromAddress])

  // Close suggestions when clicking outside
  useEffect(() => {
    if (!isSuggestionsOpen) return

    const handleClickOutside = (event) => {
      // Check if click is on the address input
      const isClickOnInput = addressInputRef.current && 
        (addressInputRef.current === event.target || addressInputRef.current.contains(event.target))
      
      // Check if click is on the suggestions dropdown
      const isClickOnSuggestions = suggestionsRef.current && 
        suggestionsRef.current.contains(event.target)
      
      // If click is neither on input nor suggestions, close the dropdown
      if (!isClickOnInput && !isClickOnSuggestions) {
        setIsSuggestionsOpen(false)
      }
    }

    // Use a slight delay to avoid conflicts with other click handlers
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSuggestionsOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isSuggestionsOpen) {
        setIsSuggestionsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isSuggestionsOpen])

  const handleAddressChange = (e) => {
    setFromAddress(e.target.value)
    // useEffect will handle clearing selectedPlace and opening dropdown
  }

  const handleSuggestionSelect = (suggestion) => {
    setSelectedPlace(suggestion)
    setFromAddress(suggestion.label)
    setIsSuggestionsOpen(false)
    setAddressSuggestions([])
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Trip Details</h2>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* From address */}
        <div className="relative">
          <label htmlFor="fromAddress" className="block text-sm font-medium text-gray-700 mb-2">
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
              // Open dropdown on focus if input has 3+ characters
              if (fromAddress.trim().length >= 3) {
                setIsSuggestionsOpen(true)
              }
            }}
            placeholder="Enter your starting address"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.fromAddress ? 'border-red-500' : 'border-gray-300'
            }`}
            autoComplete="off"
          />
          {errors.fromAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.fromAddress}</p>
          )}
          
          {/* Address suggestions dropdown */}
          {isSuggestionsOpen && fromAddress.trim().length >= 3 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {isSuggestionsLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading suggestions...</div>
              ) : addressSuggestions.length > 0 ? (
                addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    {suggestion.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No results</div>
              )}
            </div>
          )}
        </div>

        {/* Airport */}
        <div>
          <label htmlFor="airport" className="block text-sm font-medium text-gray-700 mb-2">
            Airport
          </label>
          <select
            id="airport"
            name="airport"
            value={airport}
            onChange={(e) => setAirport(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.airport ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select an airport</option>
            <option value="JFK">JFK</option>
            <option value="LGA">LGA</option>
            <option value="EWR">EWR</option>
          </select>
          {errors.airport && (
            <p className="mt-1 text-sm text-red-600">{errors.airport}</p>
          )}
        </div>

        {/* Desired arrival date */}
        <div>
          <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 mb-2">
            Desired arrival date
          </label>
          <input
            type="date"
            id="arrivalDate"
            name="arrivalDate"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.arrivalDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.arrivalDate && (
            <p className="mt-1 text-sm text-red-600">{errors.arrivalDate}</p>
          )}
        </div>

        {/* Desired arrival time */}
        <div>
          <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700 mb-2">
            Desired arrival time
          </label>
          <input
            type="time"
            id="arrivalTime"
            name="arrivalTime"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.arrivalTime ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.arrivalTime && (
            <p className="mt-1 text-sm text-red-600">{errors.arrivalTime}</p>
          )}
        </div>

        {/* Transportation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="transportDrive" className="ml-2 text-sm text-gray-700">
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="transportCab" className="ml-2 text-sm text-gray-700">
                I am taking a cab or rideshare
              </label>
            </div>
          </div>
          {errors.transportMode && (
            <p className="mt-1 text-sm text-red-600">{errors.transportMode}</p>
          )}

          {/* Cab pickup buffer - shown when cab selected */}
          {transportMode === 'cab' && (
            <div className="mt-4 ml-6">
              <label htmlFor="cabBuffer" className="block text-sm font-medium text-gray-700 mb-2">
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
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cabBuffer ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cabBuffer && (
                <p className="mt-1 text-sm text-red-600">{errors.cabBuffer}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 italic">
                Please enter how long it usually takes for a cab to arrive in your area.
              </p>
            </div>
          )}
        </div>

        {/* Weather condition */}
        <div>
          <label htmlFor="weather" className="block text-sm font-medium text-gray-700 mb-2">
            Weather condition
          </label>
          <select
            id="weather"
            name="weather"
            value={weatherCondition}
            onChange={(e) => setWeatherCondition(e.target.value)}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.weatherCondition ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select weather condition</option>
            <option value="clear">Clear</option>
            <option value="light-rain">Light rain</option>
            <option value="heavy-rain">Heavy rain</option>
            <option value="snow-ice">Snow or ice</option>
            <option value="severe">Severe weather</option>
          </select>
          {errors.weatherCondition && (
            <p className="mt-1 text-sm text-red-600">{errors.weatherCondition}</p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Calculate time to leave
          </button>
        </div>
      </form>
    </div>
  );
}

export default TripForm;


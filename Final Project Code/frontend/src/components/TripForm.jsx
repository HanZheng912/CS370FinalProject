import { useState } from 'react'
import { validateTripForm } from '../utils/validation'

function TripForm({ onSubmit }) {
  const [fromAddress, setFromAddress] = useState('')
  const [airport, setAirport] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [cabBuffer, setCabBuffer] = useState('10')
  const [weatherCondition, setWeatherCondition] = useState('')
  const [errors, setErrors] = useState({})

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
    if (onSubmit) {
      onSubmit()
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Trip Details</h2>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* From address */}
        <div>
          <label htmlFor="fromAddress" className="block text-sm font-medium text-gray-700 mb-2">
            From address
          </label>
          <input
            type="text"
            id="fromAddress"
            name="fromAddress"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="Enter your starting address"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.fromAddress ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.fromAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.fromAddress}</p>
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


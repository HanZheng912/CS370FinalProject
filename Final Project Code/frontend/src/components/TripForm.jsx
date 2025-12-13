import { useState } from 'react'

function TripForm({ onSubmit }) {
  const [transportation, setTransportation] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit()
    }
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
            placeholder="Enter your starting address"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Airport */}
        <div>
          <label htmlFor="airport" className="block text-sm font-medium text-gray-700 mb-2">
            Airport
          </label>
          <select
            id="airport"
            name="airport"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an airport</option>
            <option value="JFK">JFK</option>
            <option value="LGA">LGA</option>
            <option value="EWR">EWR</option>
          </select>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
                checked={transportation === 'drive'}
                onChange={(e) => setTransportation(e.target.value)}
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
                checked={transportation === 'cab'}
                onChange={(e) => setTransportation(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="transportCab" className="ml-2 text-sm text-gray-700">
                I am taking a cab or rideshare
              </label>
            </div>
          </div>

          {/* Cab pickup buffer - shown when cab selected */}
          {transportation === 'cab' && (
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
                defaultValue="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-500 italic">
                Please select how long it usually takes for a cab to arrive in your area.
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select weather condition</option>
            <option value="clear">Clear</option>
            <option value="light-rain">Light rain</option>
            <option value="heavy-rain">Heavy rain</option>
            <option value="snow-ice">Snow or ice</option>
            <option value="severe">Severe weather</option>
          </select>
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


import { useState } from 'react'
import Layout from './components/Layout'
import TripForm from './components/TripForm'
import ResultsPanel from './components/ResultsPanel'
import { estimateDeparture } from './api/estimate'

function App() {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isResultsOpen, setIsResultsOpen] = useState(false)
  const [resetFormFields, setResetFormFields] = useState(null)

  const handleCalculate = async (formValues) => {
    // Prevent double submit - if already loading, do nothing
    if (status === 'loading') {
      return
    }

    setStatus('loading')
    setErrorMessage(null)

    try {
      // Build payload for estimateDeparture
      const payload = {
        fromAddressText: formValues.fromAddress,
        selectedPlaceId: formValues.selectedPlaceId || null,
        airport: formValues.airport,
        arrivalDate: formValues.arrivalDate, // Already converted to MM-DD-YYYY in TripForm
        arrivalTime: formValues.arrivalTime,
        transportMode: formValues.transportMode === 'drive' ? 'self' : 'cab',
        cabBufferMinutes: Number(formValues.cabBuffer) || 0,
        weatherCondition: formValues.weatherCondition // Already mapped in TripForm
      }

      const estimateResult = await estimateDeparture(payload)
      setResult(estimateResult)
      setStatus('success')
      setIsResultsOpen(true) // Open modal on success
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'An error occurred while calculating departure time.')
      setResult(null) // Clear result on error
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setResult(null)
    setErrorMessage(null)
    setIsResultsOpen(false)
    // Trigger form reset (preserving fromAddress and airport)
    setResetFormFields(Date.now()) // Use timestamp to trigger reset
  }

  const handleCloseModal = () => {
    setIsResultsOpen(false)
    // Do not reset status/result - form inputs are preserved
  }

  const handleCloseResults = () => {
    setStatus('idle')
    setResult(null)
    setErrorMessage(null)
    setIsResultsOpen(false)
  }

  return (
    <Layout>
      {/* Hero Section */}
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          Airport Departure Planner
        </h2>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
          Calculate when to leave using your arrival target, transportation, and weather.
        </p>
      </div>

      <TripForm 
        onCalculate={handleCalculate} 
        isLoading={status === 'loading'}
        onResetFields={resetFormFields}
      />
      {/* Show modal for success only when isResultsOpen is true */}
      {status === 'success' && isResultsOpen && (
        <ResultsPanel
          status={status}
          result={result}
          errorMessage={errorMessage}
          isOpen={isResultsOpen}
          onClose={handleCloseModal}
          onReset={handleReset}
        />
      )}
      {/* Show modal for loading and error states (current behavior) */}
      {(status === 'loading' || status === 'error') && (
        <ResultsPanel
          status={status}
          result={result}
          errorMessage={errorMessage}
          isOpen={true}
          onClose={handleCloseResults}
          onReset={handleReset}
        />
      )}
    </Layout>
  )
}

export default App

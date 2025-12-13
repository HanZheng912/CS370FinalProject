import { useState } from 'react'
import Layout from './components/Layout'
import TripForm from './components/TripForm'
import ResultsPanel from './components/ResultsPanel'
import { estimateDeparture } from './api/estimate'

function App() {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleCalculate = async (formValues) => {
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
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'An error occurred while calculating departure time.')
    }
  }

  const handleCloseResults = () => {
    setStatus('idle')
    setResult(null)
    setErrorMessage(null)
  }

  return (
    <Layout>
      <TripForm onCalculate={handleCalculate} />
      {status !== 'idle' && (
        <ResultsPanel
          status={status}
          result={result}
          errorMessage={errorMessage}
          onClose={handleCloseResults}
        />
      )}
    </Layout>
  )
}

export default App

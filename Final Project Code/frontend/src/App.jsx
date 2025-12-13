import { useState } from 'react'
import Layout from './components/Layout'
import TripForm from './components/TripForm'
import ResultsPanel from './components/ResultsPanel'

function App() {
  const [showResults, setShowResults] = useState(false)

  const handleFormSubmit = () => {
    setShowResults(true)
  }

  const handleCloseResults = () => {
    setShowResults(false)
  }

  return (
    <Layout>
      <TripForm onSubmit={handleFormSubmit} />
      {showResults && <ResultsPanel onClose={handleCloseResults} />}
    </Layout>
  )
}

export default App

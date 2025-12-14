import { useEffect } from 'react'

function ResultsPanel({ status, result, errorMessage, onClose, onReset, isOpen = true }) {
  const formatDateTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>
      
      {/* Modal popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        // Close modal when clicking outside (on the backdrop area, not the modal content)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}>
        <div 
          className="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Recommended time to leave</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content based on status */}
          {status === 'idle' && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Enter trip details to calculate your departure time.
              </p>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Calculating time to leave…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 text-lg font-semibold mb-2">Error</p>
              <p className="text-gray-600 mb-6">{errorMessage || 'An error occurred while calculating departure time.'}</p>
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Recommended Departure Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatDateTime(result.recommendedLeaveDateTime)}
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base travel time:</span>
                    <span className="font-medium">{result.breakdown.baseTravelMinutes} minutes</span>
                  </div>
                  {result.breakdown.cabBufferMinutes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cab pickup buffer:</span>
                      <span className="font-medium">{result.breakdown.cabBufferMinutes} minutes</span>
                    </div>
                  )}
                  {result.breakdown.weatherExtraMinutes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weather adjustment:</span>
                      <span className="font-medium">{result.breakdown.weatherExtraMinutes} minutes</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-gray-800">Total:</span>
                    <span className="font-bold text-gray-900">{result.breakdown.totalMinutes} minutes</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                {onReset && (
                  <button
                    onClick={onReset}
                    className="w-full px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Recalculate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ResultsPanel;


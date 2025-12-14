export function validateTripForm(values) {
  const errors = {}

  // fromAddress: required (non-empty after trim)
  if (!values.fromAddress || values.fromAddress.trim() === '') {
    errors.fromAddress = 'From address is required'
  }

  // airport: required
  if (!values.airport || values.airport === '') {
    errors.airport = 'Airport selection is required'
  }

  // arrivalDate: required
  if (!values.arrivalDate || values.arrivalDate === '') {
    errors.arrivalDate = 'Arrival date is required'
  }

  // arrivalTime: required
  if (!values.arrivalTime || values.arrivalTime === '') {
    errors.arrivalTime = 'Arrival time is required'
  }

  // transportMode: required
  if (!values.transportMode || values.transportMode === '') {
    errors.transportMode = 'Transportation mode is required'
  }

  // cabBuffer: required only if transportMode is "cab"
  if (values.transportMode === 'cab' && (!values.cabBuffer || values.cabBuffer === '')) {
    errors.cabBuffer = 'Cab pickup buffer is required when using cab or rideshare'
  }

  // weatherCondition: required
  if (!values.weatherCondition || values.weatherCondition === '') {
    errors.weatherCondition = 'Weather condition is required'
  }

  const isValid = Object.keys(errors).length === 0

  return { isValid, errors }
}


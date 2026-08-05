/** What a form renders when its mutation is idle or has just succeeded. */
const NO_ERRORS = { fieldErrors: {}, message: null }

/**
 * Reads a TanStack mutation's error into the same shape a form renders.
 * Keeps screens free of `error ? ... : ...` at every use site.
 */
export function mutationErrors(error) {
  return error ? toFormErrors(error) : NO_ERRORS
}

/**
 * Turns an ApiError into { fieldErrors, message } for a form to render.
 *
 * Laravel returns a 422 with a field-keyed bag; anything else (401, 403, 500,
 * or no network at all) has no field to attach to and belongs in the banner.
 */
export function toFormErrors(error) {
  const bag = error?.errors

  if (bag && typeof bag === 'object') {
    const fieldErrors = {}
    for (const [field, messages] of Object.entries(bag)) {
      fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
    }
    // A 422 whose bag is empty still needs to say something.
    if (Object.keys(fieldErrors).length > 0) {
      return { fieldErrors, message: null }
    }
  }

  return {
    fieldErrors: {},
    message: error?.message ?? 'Something went wrong. Please try again.',
  }
}

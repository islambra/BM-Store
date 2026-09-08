export const sendSuccess = (res, data, message, status = 200) =>
  res.status(status).json({ success: true, data, message })

export const sendError = (res, message = 'Something went wrong', status = 400) =>
  res.status(status).json({ success: false, message })

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
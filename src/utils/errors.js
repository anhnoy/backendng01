// Unified error & success response helpers
// Format (error): { success:false, error:{ code, message, details }, message }
// Format (success optional): { success:true, data }
// Keeping top-level message for backward compatibility with existing tests expecting `message`.

const STATUS_CODE_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  500: 'INTERNAL_ERROR'
};

function sendError(res, status = 400, message = 'Error', details) {
  const code = STATUS_CODE_MAP[status] || 'ERROR';
  return res.status(status).json({ success: false, error: { code, message, details }, message });
}

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

module.exports = { sendError, sendSuccess };

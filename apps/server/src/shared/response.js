export const successResponse = (data = {}) => ({
  success: true,
  data,
  error: null
});

export const errorResponse = (message, details = null) => ({
  success: false,
  data: {},
  error: {
    message,
    details
  }
});

// Wrapper function to avoid the boilerplate code of async-await and try-catch
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};

// Different approach
// const asyncHandler = (requestHandler) => {
//   return (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((error) =>
//       next(error)
//     );
//   };
// };

export { asyncHandler };

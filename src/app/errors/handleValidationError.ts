interface IErrorResponse {
  statusCode: number;
  message: string;
  errorMessages: Array<{ path: string; message: string }>;
}

interface IValidationErrorItem {
  path?: string;
  message?: string;
}

interface IValidationErrorInput {
  errors?: Record<string, IValidationErrorItem>;
}

const handleValidationError = (
  error: IValidationErrorInput,
): IErrorResponse => {
  const errors = Object.values(error.errors || {}).map(
    (err: IValidationErrorItem) => ({
      path: err.path || "",
      message: err.message || "Validation error",
    }),
  );

  return {
    statusCode: 400,
    message: "Validation Error",
    errorMessages: errors,
  };
};

export default handleValidationError;

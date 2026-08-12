interface IErrorResponse {
  statusCode: number;
  message: string;
  errorMessages: Array<{ path: string; message: string }>;
}

interface IClientErrorInput {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const handleClientError = (error: IClientErrorInput): IErrorResponse => {
  return {
    statusCode: error.response?.status || 500,
    message: error.message || "Client Error",
    errorMessages: [
      {
        path: "",
        message:
          error.response?.data?.message || error.message || "Client Error",
      },
    ],
  };
};

export default handleClientError;

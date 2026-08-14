import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import handleZodError from "../errors/handleZodError";
import { Prisma } from "@prisma/client";
import handlePrismaError from "../errors/handlePrismaError";
import handleValidationError from "../errors/handleValidationError";
import handleClientError from "../errors/handleClientError";
import AppError from "../errors/AppError";
import config from "../config";
import logger from "../utils/logger";

interface IErrorResponse {
  success: boolean;
  message: string;
  errorMessages?: Array<{ path: string; message: string }>;
  stack?: string;
}

type IGlobalError = Error & {
  name?: string;
  isAxiosError?: boolean;
  statusCode?: number;
};

const globalErrorHandler = (
  err: IGlobalError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errorMessages: Array<{ path: string; message: string }> = [];

  if (err instanceof ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    const simplified = handlePrismaError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds 5MB limit";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected file field: ${err.field || "unknown"}`;
    } else {
      message = err.message || "File upload error";
    }
    errorMessages = [{ path: err.field || "file", message }];
  } else if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400 &&
    "body" in err
  ) {
    statusCode = 400;
    message = "Malformed JSON payload in request body";
    errorMessages = [{ path: "body", message: "Malformed JSON payload" }];
  } else if (err.name === "ValidationError") {
    const simplified = handleValidationError(
      err as unknown as Parameters<typeof handleValidationError>[0],
    );
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    errorMessages = [{ path: "", message: "Invalid token" }];
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    errorMessages = [{ path: "", message: "Token has expired" }];
  } else if (err.name === "NotBeforeError") {
    statusCode = 401;
    message = "Token not active yet";
    errorMessages = [{ path: "", message: "Token not active yet" }];
  } else if (err.isAxiosError) {
    const simplified = handleClientError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessages = simplified.errorMessages;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = [{ path: "", message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorMessages = [{ path: "", message: err.message }];
  }

  // Structured Logging
  logger.error(
    `[${req.method}] ${req.originalUrl} - ${statusCode} - ${message}`,
    {
      statusCode,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      errorMessages,
      stack: err.stack,
    },
  );

  const response: IErrorResponse = {
    success: false,
    message,
    errorMessages,
  };

  if (config.env === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;

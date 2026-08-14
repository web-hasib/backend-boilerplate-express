import { Prisma } from "@prisma/client";

interface IErrorResponse {
  statusCode: number;
  message: string;
  errorMessages: Array<{ path: string; message: string }>;
}

const handlePrismaError = (error: unknown): IErrorResponse => {
  let statusCode = 500;
  let message = "Database Error";
  const errorMessages: Array<{ path: string; message: string }> = [];

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      message = "Unique constraint violation";
      const target = error.meta?.target;
      let fieldPath = "";
      let fieldDisplay = "Field";

      if (Array.isArray(target)) {
        fieldPath = target.join(".");
        fieldDisplay = target.join(", ");
      } else if (typeof target === "string") {
        fieldPath = target;
        fieldDisplay = target.replace(/^.*_([^_]+)_key$/, "$1");
      }

      errorMessages.push({
        path: fieldPath,
        message: `${fieldDisplay} already exists`,
      });
    } else if (error.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
      errorMessages.push({
        path: "",
        message: "The requested record was not found",
      });
    } else if (error.code === "P2003") {
      statusCode = 400;
      message = "Foreign key constraint failed";
      const field = (error.meta?.field_name as string) || "relation";
      errorMessages.push({
        path: field,
        message: `Invalid reference for ${field}`,
      });
    } else if (error.code === "P2014") {
      statusCode = 400;
      message = "Required relation violation";
      errorMessages.push({
        path: "",
        message:
          "The change would violate a required relationship between models",
      });
    } else {
      errorMessages.push({
        path: "",
        message: error.message,
      });
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Database Validation Error";
    errorMessages.push({
      path: "",
      message: error.message,
    });
  }

  return { statusCode, message, errorMessages };
};

export default handlePrismaError;

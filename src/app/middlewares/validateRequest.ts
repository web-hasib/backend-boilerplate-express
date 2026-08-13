import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import catchAsync from "../utils/catchAsync";

type RequestValidation = {
  body?: z.Schema;
  query?: z.Schema;
  params?: z.Schema;
};

/**
 * Enterprise-Grade Request Validation Middleware for Express 5
 *
 * Validates req.body, req.query, and req.params against Zod schemas.
 * Uses in-place Object.assign mutation to preserve V8 hidden classes,
 * inline caching, and Express 5 getter integrity without low-level
 * property descriptor mutation.
 */
const validateRequest = (schema: RequestValidation) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }

    if (schema.query) {
      const parsedQuery = (await schema.query.parseAsync(req.query)) as Record<
        string,
        unknown
      >;
      // Clear raw unparsed query keys and assign Zod-coerced/defaulted values
      for (const key of Object.keys(req.query)) {
        delete (req.query as Record<string, unknown>)[key];
      }
      Object.assign(req.query, parsedQuery);
    }

    if (schema.params) {
      const parsedParams = (await schema.params.parseAsync(req.params)) as Record<
        string,
        unknown
      >;
      for (const key of Object.keys(req.params)) {
        delete (req.params as Record<string, unknown>)[key];
      }
      Object.assign(req.params, parsedParams);
    }

    next();
  });
};

export default validateRequest;

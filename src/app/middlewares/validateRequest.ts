import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import catchAsync from "../utils/catchAsync";

// Define a type for your request validation object (replaces AnyZodObject/ZodEffects)
type RequestValidation = {
  body?: z.Schema;
  query?: z.Schema;
  params?: z.Schema;
};

const validateRequest = (schema: RequestValidation) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Parse each part and assign back to req so Zod transforms / defaults
    // actually reach the controller (parseAsync result was previously discarded)
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }
    if (schema.query) {
      req.query = (await schema.query.parseAsync(
        req.query,
      )) as typeof req.query;
    }
    if (schema.params) {
      req.params = (await schema.params.parseAsync(
        req.params,
      )) as typeof req.params;
    }

    next();
  });
};


export default validateRequest;

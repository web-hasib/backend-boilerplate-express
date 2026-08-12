import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

const parseBodyData = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body && req.body.bodyData) {
    try {
      req.body = JSON.parse(req.body.bodyData); // JSON.parse is synchronous
    } catch {
      next(new AppError(400, "Invalid JSON format in bodyData"));
      return;
    }
  }
  next();
};

export default parseBodyData;


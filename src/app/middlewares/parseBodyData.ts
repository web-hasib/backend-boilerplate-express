import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

const parseBodyData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.body && req.body.bodyData) {
    try {
      // req.body = await JSON.parse(req.body.bodyData);
      req.body = await JSON.parse(req.body.bodyData);
      // console.log(req.body);
    } catch (error) {
      return next(new AppError(400, "Invalid JSON format in bodyData"));
    }
  }
  next();
};

export default parseBodyData;

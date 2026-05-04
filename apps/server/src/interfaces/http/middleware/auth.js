import jwt from "jsonwebtoken";
import { env } from "../../../shared/env.js";
import { errorResponse } from "../../../shared/response.js";

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json(errorResponse("Missing bearer token"));
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (_error) {
    return res.status(401).json(errorResponse("Invalid or expired token"));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json(errorResponse("Forbidden"));
  }

  next();
};

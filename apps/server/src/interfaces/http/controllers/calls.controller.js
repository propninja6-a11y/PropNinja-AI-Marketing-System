import { callService } from "../../../application/services/callService.js";
import { successResponse } from "../../../shared/response.js";

export const callsController = {
  async create(req, res, next) {
    try {
      const call = await callService.startCall(req.body);
      return res.status(201).json(successResponse(call));
    } catch (error) {
      return next(error);
    }
  }
};

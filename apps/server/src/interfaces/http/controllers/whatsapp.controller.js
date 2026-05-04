import { whatsappService } from "../../../application/services/whatsappService.js";
import { successResponse } from "../../../shared/response.js";

export const whatsappController = {
  async send(req, res, next) {
    try {
      await whatsappService.sendWelcome(req.body);
      return res.status(201).json(successResponse({}));
    } catch (error) {
      return next(error);
    }
  }
};

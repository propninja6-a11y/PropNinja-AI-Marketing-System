import { prospectService } from "../../../application/services/prospectService.js";
import { successResponse } from "../../../shared/response.js";

export const prospectsController = {
  async list(req, res, next) {
    try {
      const filter = req.query.filter === "all" ? "all" : "open";
      const prospects = await prospectService.list({ filter });
      return res.json(successResponse(prospects));
    } catch (error) {
      return next(error);
    }
  }
};

import { errorResponse, successResponse } from "../../shared/response.js";
import { parseExcel } from "./upload.parser.js";
import { uploadService } from "./upload.service.js";

async function handleUpload(req, res, next, uploadType) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json(errorResponse("Excel file is required"));
    }
    const { parsed, errors } = parseExcel(req.file.buffer, uploadType);
    const campaignName =
      req.body?.campaignName ||
      parsed[0]?.campaign ||
      `${uploadType === "calling" ? "Calling" : "WhatsApp"} Upload Batch`;
    const result = await uploadService.enqueueBatch(
      parsed,
      uploadType,
      campaignName,
      req.file.originalname || "upload.xlsx"
    );
    await uploadService.storeValidationFailures(result.uploadId, errors, uploadType, campaignName);
    return res.status(202).json(
      successResponse({
        ...result,
        total: parsed.length,
        errors
      })
    );
  } catch (error) {
    return next(error);
  }
}

export const uploadController = {
  calling(req, res, next) {
    return handleUpload(req, res, next, "calling");
  },
  whatsapp(req, res, next) {
    return handleUpload(req, res, next, "whatsapp");
  },

  async retryFailed(_req, res, next) {
    try {
      const result = await uploadService.retryFailed(100);
      return res.json(successResponse(result));
    } catch (error) {
      return next(error);
    }
  },

  async retryFailedById(req, res, next) {
    try {
      const result = await uploadService.retryFailedById(Number(req.params.id));
      return res.json(successResponse(result));
    } catch (error) {
      return next(error);
    }
  },

  async list(_req, res, next) {
    try {
      const uploads = await uploadService.listUploads();
      return res.json(successResponse(uploads));
    } catch (error) {
      return next(error);
    }
  },

  async listFailed(_req, res, next) {
    try {
      const failures = await uploadService.listFailures(200);
      return res.json(successResponse(failures));
    } catch (error) {
      return next(error);
    }
  }
};

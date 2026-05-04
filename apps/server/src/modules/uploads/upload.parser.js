import XLSX from "xlsx";
import { z } from "zod";

const baseSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  location: z.string().optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  project: z.string().optional(),
  custom_param: z.string().optional()
});

const whatsappSchema = baseSchema.extend({
  template: z.string().min(1),
  campaign: z.string().optional()
});

const normalizeRow = (row) => ({
  name: row.name || row.Name,
  phone: String(row.phone || row.Phone || "").replace(/\D/g, ""),
  location: row.location || row.Location || "",
  budget: row.budget || row.Budget || "",
  project: row.project || row.Project || "",
  template: row.template || row.Template || "",
  campaign: row.campaign || row.Campaign || "",
  custom_param: row.custom_param || row.Custom_Param || row.customParam || ""
});

export const uploadParser = {
  parse(buffer, type = "calling") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      const error = new Error("Excel file has no sheets");
      error.status = 400;
      throw error;
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    const parsed = [];
    const errors = [];

    rows.forEach((row, index) => {
      try {
        const normalized = normalizeRow(row);
        const data = type === "whatsapp" ? whatsappSchema.parse(normalized) : baseSchema.parse(normalized);
        parsed.push(data);
      } catch (error) {
        errors.push({
          row: index + 1,
          rowData: normalized,
          error: error.errors || error.message
        });
      }
    });

    return { parsed, errors };
  }
};

export function parseExcel(fileBuffer, type = "calling") {
  return uploadParser.parse(fileBuffer, type);
}

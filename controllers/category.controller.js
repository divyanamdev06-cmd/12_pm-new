import Category from "../models/category.model.js";
import Job from "../models/Job.js";
import { sendResponse } from "../utils/response.js";
import { normalizeRole } from "../utils/role.util.js";

function slugify(name) {
  const base = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "category";
}

async function uniqueSlugForName(name, excludeId) {
  let slug = slugify(name);
  let n = 0;
  for (;;) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Category.findOne(q).lean();
    if (!exists) return slug;
    slug = `${slugify(name)}-${++n}`;
  }
}

const UPDATABLE = new Set(["name", "description", "sortOrder", "isActive"]);

function pickCategoryBody(body) {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const k of UPDATABLE) {
    if (body[k] === undefined) continue;
    if (k === "sortOrder") {
      const n = Number(body[k]);
      if (!Number.isNaN(n)) out[k] = n;
      continue;
    }
    if (k === "isActive") {
      out[k] = Boolean(body[k]);
      continue;
    }
    out[k] = body[k];
  }
  return out;
}

export const createCategory = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "Category name is required",
      });
    }
    const description = String(req.body?.description ?? "").trim();
    const sortOrder = Number(req.body?.sortOrder);
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;

    const slug = await uniqueSlugForName(name, null);

    const category = await Category.create({
      name,
      slug,
      description,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      isActive,
    });

    return sendResponse(res, {
      statusCode: 201,
      message: "Category created successfully",
      data: category,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "A category with that name (or slug) already exists",
      });
    }
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to create category",
      error: err.message,
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const role = req.auth ? normalizeRole(req.auth.role) : null;
    const filter =
      !req.auth || role !== "admin"
        ? { $or: [{ isActive: true }, { isActive: { $exists: false } }] }
        : {};

    const data = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

    return sendResponse(res, {
      message: "Categories fetched successfully",
      data,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch categories",
      error: err.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Category not found",
      });
    }

    const patch = pickCategoryBody(req.body);
    if (Object.keys(patch).length === 0) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "No valid fields to update",
      });
    }

    if (patch.name !== undefined) {
      patch.name = String(patch.name).trim();
      if (!patch.name) {
        return sendResponse(res, {
          success: false,
          statusCode: 400,
          message: "Name cannot be empty",
        });
      }
      patch.slug = await uniqueSlugForName(patch.name, existing._id);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });

    return sendResponse(res, {
      message: "Category updated successfully",
      data: category,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "That name or slug is already used by another category",
      });
    }
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update category",
      error: err.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Category.findById(id);
    if (!existing) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Category not found",
      });
    }

    const jobCount = await Job.countDocuments({ category: id });
    if (jobCount > 0) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: `Cannot delete: ${jobCount} job(s) still use this category. Reassign or remove those jobs first.`,
      });
    }

    await Category.findByIdAndDelete(id);

    return sendResponse(res, {
      message: "Category deleted successfully",
      data: { id },
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to delete category",
      error: err.message,
    });
  }
};

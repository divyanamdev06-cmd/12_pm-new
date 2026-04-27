// controllers/category.controller.js
import Category from "../models/category.model.js";
import { sendResponse } from "../utils/response.js";

// CREATE
export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return sendResponse(res, {
      statusCode: 201,
      message: "Category created successfully",
      data: category,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to create category",
      error: err.message,
    });
  }
};

// GET ALL
export const getCategories = async (req, res) => {
  try {
    const data = await Category.find().sort({ createdAt: -1 });
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

// UPDATE
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!category) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Category not found",
      });
    }
    return sendResponse(res, {
      message: "Category updated successfully",
      data: category,
    });
  } catch (err) {
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update category",
      error: err.message,
    });
  }
};

// DELETE
export const deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "Category not found",
      });
    }
    return sendResponse(res, {
      message: "Category deleted successfully",
      data: deleted,
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
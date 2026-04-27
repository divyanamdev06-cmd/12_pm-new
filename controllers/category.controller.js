// controllers/category.controller.js
import Category from "../models/category.model.js";

// CREATE
export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL
export const getCategories = async (req, res) => {
  try {
    const data = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
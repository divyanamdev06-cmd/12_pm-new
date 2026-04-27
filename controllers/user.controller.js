import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/response.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, mobile, role } = req.body;

    const existuser = await User.findOne({ email });
    if (existuser) {
      return sendResponse(res, {
        success: false,
        message: "Email already exists",
        statusCode: 400
      });
    }

    const newuser = new User({ name, email, password, mobile, role });
    await newuser.save();

    return sendResponse(res, {
      message: "User created successfully",
      data: newuser
    });

  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, {
        success: false,
        message: "All fields are required",
        statusCode: 400
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, {
        success: false,
        message: "Email not registered",
        statusCode: 404
      });
    }

    if (user.password !== password) {
      return sendResponse(res, {
        success: false,
        message: "Wrong password",
        statusCode: 401
      });
    }

    return sendResponse(res, {
      message: "Login successful",
      data: user
    });

  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500
    });
  }
};

export const completeProfile = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware (JWT)

    const {
      address,
      city,
      state,
      pincode,
      dob,
      gender,
      bio,
      skills,
      interests,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        address: {
          city,
          state,
          pincode,
        },
        dob,
        gender,
        bio,
        skills,
        interests,
      },
      { new: true } // return updated data
    );

    return res.json({
      message: "Profile completed successfully",
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      success: false,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      return sendResponse(res, {
        success: false,
        message: "No users found",
        statusCode: 404
      });
    }
    return sendResponse(res, {
      message: "Users fetched successfully",
      data: users || []
    });
    console.log(res.data);

  } catch (error) {
    return sendResponse(res, {
      success: false,
      message: "Server error",
      error: error.message,
      statusCode: 500
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // ❌ prevent updating restricted fields
    const { email, mobile, ...updateData } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true, // return updated data
        runValidators: true, // apply schema validation
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    // validate input
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User is now ${status}`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


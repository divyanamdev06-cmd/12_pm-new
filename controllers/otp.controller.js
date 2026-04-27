
import { Otp } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendResponse } from "../utils/response.js";

export const sendOtp = async (req, res) => {
  try {
    const { sendBy, sendFrom, sendFor } = req.body;

    // validation
    if (!sendBy || !sendFrom) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "Email (sendBy) and sendFrom are required",
      });
    }
    const user = await User.findOne({ email: sendBy });
    if (!user) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

    // generate OTP
    const otp = generateOtp(6);

    // expiry (5 min)
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // save in DB
    const newOtp = await Otp.create({
      sendBy,
      sendFrom,
      sendFor,
      otp,
      expiryAt: expiryTime,
    });

    // TODO: integrate email or SMS here
    console.log("Generated OTP:", otp);

    return sendResponse(res, {
      message: "OTP sent successfully",
      data: newOtp,
    });

  } catch (error) {
    console.error(error);
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { sendBy, sendFrom, sendFor, otp } = req.body;

    // validation
    if (!sendBy || !sendFrom || !otp) {
      return sendResponse(res, {
        success: false,
        statusCode: 400,
        message: "sendBy, sendFrom and otp are required",
      });
    }

    const otprecord = await Otp.findOne({ sendBy, sendFrom, sendFor })
    if (!otprecord) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "OTP not found",
      });
    }

    if (otprecord.expiryAt < Date.now()) {
      return sendResponse(res, {
        success: false,
        statusCode: 410,
        message: "OTP has expired",
      });
    }

    if (otprecord.otp != otp) {
      return sendResponse(res, {
        success: false,
        statusCode: 401,
        message: "Invalid OTP",
      });
    }

    const user = await User.findOne({ email: sendBy });
    if (!user) {
      return sendResponse(res, {
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

    if (user.isEmailVerified == true) {
      return sendResponse(res, {
        success: false,
        statusCode: 409,
        message: "Email is already verified",
      });
    }
    user.isEmailVerified = true;
    await user.save();

    return sendResponse(res, {
      message: "OTP verified successfully",
      data: { userId: user._id, isEmailVerified: true },
    });

  } catch (error) {
    console.error(error);
    return sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};
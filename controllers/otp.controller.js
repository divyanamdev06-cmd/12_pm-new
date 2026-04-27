
import { Otp } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { generateOtp } from "../utils/generateOtp.js";

export const sendOtp = async (req, res) => {
  try {
    const { sendBy, sendFrom, sendFor } = req.body;

    // validation
    if (!sendBy || !sendFrom) {
      return res.status(400).json({
        success: false,
        message: "sendBy and sendFrom are required",
      });
    }
    const user = await User.findOne({ email: sendBy });
    if (!user) {
      return res.json({
        success: false,
        message: "user not found",
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

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: newOtp,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { sendBy, sendFrom, sendFor, otp } = req.body;

    // validation
    if (!sendBy || !sendFrom || !otp) {
      return res.status(400).json({
        success: false,
        message: "sendBy , sendFrom  and otp  are required",
      });
    }

    const otprecord = await Otp.findOne({ sendBy, sendFrom, sendFor })
    if (!otprecord) {
      return res.json({
        success: false,
        message: "otp not found",
      });
    }

    if (otprecord.expiryAt < Date.now()) {
      return res.json({
        success: false,
        message: "otp is expired",
      });
    }

    if (otprecord.otp != otp) {
      return res.json({
        success: false,
        message: "wrong otp",
      });
    }

    const user = await User.findOne({ email: sendBy });
    if (!user) {
      return res.json({
        success: false,
        message: "user not found",
      });
    }

    if (user.isEmailVerified == true) {
      return res.json({
        success: false,
        message: "email is all ready verified",
      });
    }
    user.isEmailVerified = true;
    user.save();

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: newOtp,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
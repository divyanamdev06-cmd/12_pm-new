import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    sendBy: {
      type: String,
      required: true,
    },

    sendFrom: {
      type: String,
      enum: ["email", "mobile"]
    },

    sendFor: {
      type: String,
      enum: ["verification", "forgot", "other"],
    },

    otp: {type: String},
    expiryAt:{type : Date}

},{timestamps: true});

export const Otp = mongoose.model("otp", otpSchema);
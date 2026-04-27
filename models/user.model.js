import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    mobile: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // 📍 Address Object (better than flat fields)
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India",
      },
    },

    // 🎂 Date of Birth
    dob: {
      type: Date,
    },

    // 🚻 Gender
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    // 📝 Bio
    bio: {
      type: String,
      maxlength: 500,
    },

    // 💡 Skills (array is better)
    skills: [
      {
        type: String,
      },
    ],

    // ❤️ Interests
    interests: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt auto add
  }
);

export const User = mongoose.model("User", userSchema);
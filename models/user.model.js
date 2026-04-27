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

    password: {
      type: String,
      required: true,
      select: false,
    },

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    /** Account visibility for admin moderation (matches admin UI). */
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    mobile: {
      type: String,
    },

    /**
     * job_seeker — candidate
     * recruiter — company / hiring
     * admin — full access
     * user — legacy alias; treated as job_seeker in JWT and UI
     */
    role: {
      type: String,
      enum: ["job_seeker", "recruiter", "admin", "user"],
      default: "job_seeker",
    },

    companyName: {
      type: String,
      trim: true,
    },

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

    dob: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    bio: {
      type: String,
      maxlength: 500,
    },

    skills: [
      {
        type: String,
      },
    ],

    interests: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);

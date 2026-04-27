import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true, default: "" },
    degree: { type: String, trim: true, default: "" },
    field: { type: String, trim: true, default: "" },
    startYear: { type: Number },
    endYear: { type: Number },
    description: { type: String, maxlength: 2000, default: "" },
  },
  { _id: true }
);

const workExperienceSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    startDate: { type: String, trim: true, default: "" },
    endDate: { type: String, trim: true, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, maxlength: 3000, default: "" },
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    path: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    uploadedAt: { type: Date },
  },
  { _id: false }
);

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

    /** Recruiter: public-facing company details */
    companyWebsite: { type: String, trim: true, default: "" },
    companyIndustry: { type: String, trim: true, default: "" },
    companySize: { type: String, trim: true, default: "" },
    companyDescription: { type: String, maxlength: 4000, default: "" },

    /** Short professional headline (shown on profile cards) */
    headline: { type: String, trim: true, maxlength: 200, default: "" },

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
      maxlength: 2000,
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

    education: {
      type: [educationSchema],
      default: [],
    },

    workExperience: {
      type: [workExperienceSchema],
      default: [],
    },

    resume: {
      type: resumeSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);

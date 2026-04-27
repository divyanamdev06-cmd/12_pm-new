import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    salary: { type: String },

    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship"],
    },

    mode: {
      type: String,
      enum: ["On-site", "Remote", "Hybrid"],
    },

     category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",   // IMPORTANT
    },

    description: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
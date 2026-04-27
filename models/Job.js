import mongoose from "mongoose";

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];
const JOB_MODES = ["On-site", "Remote", "Hybrid", "Flexible"];
const PUBLICATION_STATUS = ["draft", "published", "archived"];
const EXPERIENCE_LEVEL = ["intern", "entry", "mid", "senior", "lead", "executive", "any"];

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    company: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, trim: true, default: "" },
    salary: { type: String, trim: true, default: "" },

    type: {
      type: String,
      enum: JOB_TYPES,
      default: "Full-time",
    },

    mode: {
      type: String,
      enum: JOB_MODES,
      default: "On-site",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    description: { type: String, maxlength: 20000, default: "" },

    /** Short summary for cards / SEO (future). */
    summary: { type: String, maxlength: 500, default: "" },

    /** Lifecycle — public listings use `published` + `isActive`. */
    publicationStatus: {
      type: String,
      enum: PUBLICATION_STATUS,
      default: "published",
    },

    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVEL,
      default: "any",
    },

    department: { type: String, trim: true, maxlength: 120, default: "" },
    openings: { type: Number, min: 1, default: 1 },

    requirements: [{ type: String, maxlength: 500 }],
    benefits: [{ type: String, maxlength: 500 }],
    skills: [{ type: String, maxlength: 80 }],

    applicationDeadline: { type: Date },
    externalApplyUrl: { type: String, trim: true, maxlength: 2000, default: "" },

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

jobSchema.index({ category: 1, isActive: 1, publicationStatus: 1 });
jobSchema.index({ createdBy: 1, updatedAt: -1 });

export default mongoose.model("Job", jobSchema);
export { JOB_TYPES, JOB_MODES, PUBLICATION_STATUS, EXPERIENCE_LEVEL };

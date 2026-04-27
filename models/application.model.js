import mongoose from "mongoose";

const STATUS = ["pending", "reviewed", "shortlisted", "rejected"];

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: STATUS,
      default: "pending",
    },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
export { STATUS as APPLICATION_STATUS };

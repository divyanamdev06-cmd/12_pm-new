import Job from "../models/Job.js";

// CREATE JOB (Admin)
// export const createJob = async (req, res) => {
//   try {
//     const job = await Job.create(req.body);
//     res.status(201).json({ success: true, job });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const createJob = async (req, res) => {
  try {
    const job = await Job.create(req.body);

    // populate after creation
    job = await job.populate("category");

    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL JOBS
// export const getJobs = async (req, res) => {
//   try {
//     const jobs = await Job.find().sort({ createdAt: -1 });
//     res.json({ success: true, jobs });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("category")   // 👈 here
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE JOB
// export const getJobById = async (req, res) => {
//   try {
//     const job = await Job.findById(req.params.id);
//     res.json({ success: true, job });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
export const getJobById = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id)
      .populate("category");   // 👈 here

    res.json({ success: true, job });
  } catch (err) {
  console.error("ERROR:", err);   // 👈 ADD THIS
  res.status(500).json({ success: false, message: err.message });
}
};

// UPDATE JOB
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE JOB
export const deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TOGGLE ACTIVE / INACTIVE
export const toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    job.isActive = !job.isActive;
    await job.save();

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getJobsByCategory = async (req, res) => {
  try {
    const jobs = await Job.find({
      category: req.params.categoryId,
      isActive: true
    })
    .populate("category")
    .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
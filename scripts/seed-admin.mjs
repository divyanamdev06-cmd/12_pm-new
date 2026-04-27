/**
 * One-time: create a default admin for JobNest local development.
 * Run from repo root: node scripts/seed-admin.mjs
 *
 * Default login: admin@jobnest.com / Admin@123
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/12pmnew";

const email = (process.env.SEED_ADMIN_EMAIL || "admin@jobnest.com").toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
const name = process.env.SEED_ADMIN_NAME || "System Admin";

await mongoose.connect(uri);

const existing = await User.findOne({ email });
if (existing) {
  console.log("Admin already exists:", email);
  await mongoose.disconnect();
  process.exit(0);
}

await User.create({
  name,
  email,
  password: String(password),
  role: "admin",
  status: "Active",
  mobile: "0000000000",
});

console.log("Created admin user");
console.log("  Email:   ", email);
console.log("  Password:", password);
await mongoose.disconnect();
process.exit(0);

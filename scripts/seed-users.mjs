/**
 * Seed job seekers + recruiters with complete profiles (education, experience, address, etc.).
 * Idempotent: upserts by email.
 *
 * Run from `12_pm-new`:  npm run seed:users
 * Requires: MongoDB (same URI as app — MONGODB_URI or default localhost 12pmnew)
 *
 * Default password for all seed accounts: Jobnest@123
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/12pmnew";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "Jobnest@123";

const jobSeekers = [
  {
    email: "riya.mehta@jobnest.seed",
    name: "Riya Mehta",
    password: SEED_PASSWORD,
    role: "job_seeker",
    mobile: "+91 98765 43210",
    status: "Active",
    isEmailVerified: true,
    isActive: true,
    headline: "Full-stack developer · React, Node, MongoDB",
    bio: "Three years building web apps for startups. I care about clean APIs, accessible UI, and measurable performance. Open to hybrid roles in Bangalore or remote-first teams.",
    gender: "female",
    dob: new Date("1998-06-15"),
    address: {
      street: "42, Koramangala 5th Block",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560095",
      country: "India",
    },
    skills: ["JavaScript", "React", "Node.js", "MongoDB", "REST APIs", "Git", "Tailwind CSS"],
    interests: ["Open source", "Tech talks", "Badminton"],
    education: [
      {
        institution: "RV College of Engineering",
        degree: "B.E.",
        field: "Computer Science",
        startYear: 2016,
        endYear: 2020,
        description: "Coursework in data structures, OS, and distributed systems. Final project: campus ride-sharing MVP.",
      },
    ],
    workExperience: [
      {
        company: "BrightApps Tech",
        title: "Software Engineer II",
        location: "Bengaluru",
        startDate: "2022-03-01",
        endDate: "",
        current: true,
        description:
          "Own features for a B2B SaaS dashboard (React + Node). Reduced API latency by 30% through caching and query tuning.",
      },
      {
        company: "PixelNest Studio",
        title: "Junior Developer",
        location: "Bengaluru",
        startDate: "2020-08-01",
        endDate: "2022-02-28",
        current: false,
        description: "Built marketing sites and internal tools with React and Express.",
      },
    ],
  },
  {
    email: "arjun.verma@jobnest.seed",
    name: "Arjun Verma",
    password: SEED_PASSWORD,
    role: "job_seeker",
    mobile: "+91 91234 56780",
    status: "Active",
    isEmailVerified: true,
    isActive: true,
    headline: "Data analyst · SQL, Python, dashboards",
    bio: "Analyst with a finance background turning raw data into decisions. Comfortable with SQL, Python, and stakeholder workshops.",
    gender: "male",
    dob: new Date("1996-11-02"),
    address: {
      street: "Plot 18, Sector 62",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      country: "India",
    },
    skills: ["SQL", "Python", "Excel", "Power BI", "Statistics", "ETL basics"],
    interests: ["Cricket analytics", "Reading"],
    education: [
      {
        institution: "Shri Ram College of Commerce",
        degree: "B.Com (Hons)",
        field: "Finance",
        startYear: 2015,
        endYear: 2018,
        description: "Graduated with distinction. Electives in business statistics.",
      },
      {
        institution: "ISB Hyderabad (online)",
        degree: "Certificate",
        field: "Business Analytics",
        startYear: 2021,
        endYear: 2021,
        description: "Intensive program on regression, forecasting, and visualization.",
      },
    ],
    workExperience: [
      {
        company: "Northwind Finance",
        title: "Senior Data Analyst",
        location: "Gurugram",
        startDate: "2021-01-04",
        endDate: "",
        current: true,
        description: "Monthly revenue reporting, cohort analysis, and board-ready dashboards.",
      },
    ],
  },
];

const recruiters = [
  {
    email: "priya.nair@jobnest.seed",
    name: "Priya Nair",
    password: SEED_PASSWORD,
    role: "recruiter",
    mobile: "+91 99887 76655",
    status: "Active",
    isEmailVerified: true,
    isActive: true,
    headline: "Head of Talent · TechCorp Solutions",
    bio: "Hiring engineers and product folks for our product teams across India. We value ownership, clarity, and kind collaboration.",
    gender: "female",
    dob: new Date("1990-04-22"),
    companyName: "TechCorp Solutions Pvt Ltd",
    companyWebsite: "https://techcorp-solutions.example.com",
    companyIndustry: "Information Technology & Services",
    companySize: "201–500",
    companyDescription:
      "TechCorp builds workflow automation for mid-market enterprises. Founded in 2012, we are remote-friendly with hubs in Bengaluru and Pune.",
    address: {
      street: "9th Floor, Prestige Tech Park",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      country: "India",
    },
    skills: ["Technical recruiting", "Employer branding", "ATS tools"],
    interests: ["Diversity in tech", "Campus hiring"],
    education: [
      {
        institution: "XLRI Jamshedpur",
        degree: "PGDM",
        field: "Human Resource Management",
        startYear: 2012,
        endYear: 2014,
        description: "Focus on organizational behaviour and talent strategy.",
      },
    ],
    workExperience: [
      {
        company: "TechCorp Solutions Pvt Ltd",
        title: "Head of Talent Acquisition",
        location: "Bengaluru",
        startDate: "2019-07-01",
        endDate: "",
        current: true,
        description: "Lead a team of 8 recruiters; partner with engineering leadership on workforce planning.",
      },
      {
        company: "GlobalStaff RPO",
        title: "Senior Recruiter",
        location: "Bengaluru",
        startDate: "2014-08-01",
        endDate: "2019-06-30",
        current: false,
        description: "Full-cycle hiring for IT and analytics roles.",
      },
    ],
  },
  {
    email: "vikram.singh@jobnest.seed",
    name: "Vikram Singh",
    password: SEED_PASSWORD,
    role: "recruiter",
    mobile: "+91 98100 22334",
    status: "Active",
    isEmailVerified: true,
    isActive: true,
    headline: "Talent Partner · GreenHire Labs",
    bio: "Focused on climate-tech and deep-tech hiring. I work closely with founders to shape role specs and interview loops.",
    gender: "male",
    dob: new Date("1988-09-10"),
    companyName: "GreenHire Labs",
    companyWebsite: "https://greenhire-labs.example.com",
    companyIndustry: "Clean Energy / R&D",
    companySize: "51–200",
    companyDescription:
      "GreenHire Labs develops battery analytics software for grid operators. Backed by Series B funding; hybrid culture with lab in Hyderabad.",
    address: {
      street: "HITEC City, Mindspace Road",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      country: "India",
    },
    skills: ["Executive search", "Comp benchmarking", "Interview design"],
    interests: ["Cycling", "Climate policy"],
    education: [
      {
        institution: "IIT Madras",
        degree: "B.Tech",
        field: "Mechanical Engineering",
        startYear: 2006,
        endYear: 2010,
        description: "Institute merit scholarship. Student placement coordinator.",
      },
    ],
    workExperience: [
      {
        company: "GreenHire Labs",
        title: "Talent Partner",
        location: "Hyderabad",
        startDate: "2020-02-10",
        endDate: "",
        current: true,
        description: "Lead hiring for engineering, research, and GTM; built structured interview rubrics.",
      },
    ],
  },
];

async function upsertUser(doc) {
  const { email, ...rest } = doc;
  const payload = {
    ...rest,
    email: email.toLowerCase(),
    password: String(rest.password),
  };
  await User.findOneAndUpdate(
    { email: payload.email },
    { $set: payload },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
}

await mongoose.connect(uri);
console.log("Connected:", uri.replace(/\/\/.*@/, "//***@"));

for (const u of jobSeekers) {
  await upsertUser(u);
  console.log("Upserted job seeker:", u.email);
}
for (const u of recruiters) {
  await upsertUser(u);
  console.log("Upserted recruiter:", u.email);
}

console.log("\nDone. Login with any seed email and password:", SEED_PASSWORD);
console.log("Next: npm run seed:jobs   (creates categories + demo jobs for the recruiters above)\n");

await mongoose.disconnect();
process.exit(0);

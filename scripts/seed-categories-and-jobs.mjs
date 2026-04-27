/**
 * Seed categories and demo jobs (linked to seed recruiters).
 * Idempotent: categories upserted by name; jobs with titles prefixed "[Seed]" are replaced each run.
 *
 * Run AFTER seed users:  npm run seed:users && npm run seed:jobs
 * From `12_pm-new`:       npm run seed:jobs
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import Category from "../models/category.model.js";
import Job from "../models/Job.js";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/12pmnew";

const SEED_TITLE_PREFIX = "[Seed] ";

const categoriesSeed = [
  {
    name: "IT & Software",
    slug: "it-software",
    description: "Engineering, infrastructure, security, and product roles.",
    sortOrder: 10,
    isActive: true,
  },
  {
    name: "Data & Analytics",
    slug: "data-analytics",
    description: "Data science, analytics engineering, and BI.",
    sortOrder: 20,
    isActive: true,
  },
  {
    name: "Design & UX",
    slug: "design-ux",
    description: "Product design, research, and brand.",
    sortOrder: 30,
    isActive: true,
  },
  {
    name: "Sales & Marketing",
    slug: "sales-marketing",
    description: "GTM, growth, content, and account management.",
    sortOrder: 40,
    isActive: true,
  },
  {
    name: "HR & Operations",
    slug: "hr-operations",
    description: "People ops, recruiting coordination, and business operations.",
    sortOrder: 50,
    isActive: true,
  },
];

async function upsertCategory(c) {
  await Category.findOneAndUpdate(
    { name: c.name },
    {
      $set: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  );
}

function buildJobs(catByName, recruiters) {
  const [priya, vikram] = recruiters;
  if (!priya || !vikram) return [];

  const it = catByName["IT & Software"];
  const data = catByName["Data & Analytics"];
  const design = catByName["Design & UX"];
  const sales = catByName["Sales & Marketing"];

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 2);

  return [
    {
      title: `${SEED_TITLE_PREFIX}Senior Full-Stack Engineer`,
      company: "TechCorp Solutions Pvt Ltd",
      location: "Bengaluru (Hybrid)",
      salary: "₹28–38 LPA",
      type: "Full-time",
      mode: "Hybrid",
      category: it._id,
      summary: "Own features for our workflow automation platform. React, Node, PostgreSQL.",
      description:
        "You will ship end-to-end features, mentor juniors, and partner with product on discovery. We use React 18, Node 20, and Postgres on AWS.\n\nWhat success looks like: predictable releases, clear RFCs, and a blameless postmortem culture.",
      publicationStatus: "published",
      experienceLevel: "senior",
      department: "Engineering",
      openings: 2,
      requirements: [
        "5+ years shipping web products",
        "Strong TypeScript and React",
        "Experience designing REST or GraphQL APIs",
        "Comfortable with SQL and schema migrations",
      ],
      benefits: ["Health insurance", "Learning budget ₹1.5L/year", "Flexible hours", "ESOP"],
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
      applicationDeadline: deadline,
      externalApplyUrl: "https://techcorp-solutions.example.com/careers/seed-fe",
      isActive: true,
      createdBy: priya._id,
    },
    {
      title: `${SEED_TITLE_PREFIX}Backend Engineer — Platform`,
      company: "TechCorp Solutions Pvt Ltd",
      location: "Pune / Remote (India)",
      salary: "₹18–26 LPA",
      type: "Full-time",
      mode: "Remote",
      category: it._id,
      summary: "Build reliable services for multi-tenant workflows and integrations.",
      description:
        "Join the platform team owning auth, webhooks, and background workers. We value observability, idempotent jobs, and clear runbooks.",
      publicationStatus: "published",
      experienceLevel: "mid",
      department: "Engineering",
      openings: 1,
      requirements: ["3+ years Node or Go", "PostgreSQL", "Message queues", "Docker basics"],
      benefits: ["Remote-first", "Home office stipend", "Platinum health cover"],
      skills: ["Node.js", "PostgreSQL", "Redis", "Docker"],
      applicationDeadline: deadline,
      isActive: true,
      createdBy: priya._id,
    },
    {
      title: `${SEED_TITLE_PREFIX}Data Analyst — Finance vertical`,
      company: "TechCorp Solutions Pvt Ltd",
      location: "Gurugram",
      salary: "₹12–18 LPA",
      type: "Full-time",
      mode: "On-site",
      category: data._id,
      summary: "Partner with finance customers on reporting, cohorts, and KPI definitions.",
      description:
        "You will translate business questions into SQL and dashboards, document metric definitions, and support customer workshops.",
      publicationStatus: "published",
      experienceLevel: "entry",
      department: "Customer Success Analytics",
      openings: 1,
      requirements: ["Strong SQL", "Excel / Sheets advanced", "Stakeholder communication", "Python a plus"],
      benefits: ["Shuttle from metro", "Lunch subsidy", "Annual health check"],
      skills: ["SQL", "Python", "Power BI"],
      isActive: true,
      createdBy: priya._id,
    },
    {
      title: `${SEED_TITLE_PREFIX}Product Designer (Climate tech)`,
      company: "GreenHire Labs",
      location: "Hyderabad (Hybrid)",
      salary: "₹22–32 LPA",
      type: "Full-time",
      mode: "Hybrid",
      category: design._id,
      summary: "Design complex analytics UIs for grid operators and battery OEMs.",
      description:
        "You will run discovery with researchers and engineers, maintain a Figma design system, and validate flows with usability tests.",
      publicationStatus: "published",
      experienceLevel: "mid",
      department: "Product",
      openings: 1,
      requirements: ["Portfolio with B2B or data-heavy products", "Figma", "Systems thinking"],
      benefits: ["Lab visits with domain experts", "Conference budget", "Sponsored certification"],
      skills: ["Figma", "Design systems", "User research", "Prototyping"],
      applicationDeadline: deadline,
      externalApplyUrl: "https://greenhire-labs.example.com/careers/seed-designer",
      isActive: true,
      createdBy: vikram._id,
    },
    {
      title: `${SEED_TITLE_PREFIX}Battery Research Scientist`,
      company: "GreenHire Labs",
      location: "Hyderabad",
      salary: "₹35–50 LPA",
      type: "Full-time",
      mode: "On-site",
      category: it._id,
      summary: "R&D role improving state-of-health models for lithium-ion packs.",
      description:
        "Collaborate with hardware and firmware teams. PhD or equivalent experience in electrochemistry or related field preferred.",
      publicationStatus: "draft",
      experienceLevel: "senior",
      department: "R&D",
      openings: 1,
      requirements: ["PhD or 6+ years industry R&D", "Python for data analysis", "Published work a plus"],
      benefits: ["Relocation support", "Patent bonus program"],
      skills: ["Python", "MATLAB", "Electrochemistry"],
      isActive: true,
      createdBy: vikram._id,
    },
    {
      title: `${SEED_TITLE_PREFIX}Growth Marketing Manager`,
      company: "GreenHire Labs",
      location: "Remote (India)",
      salary: "₹16–24 LPA",
      type: "Full-time",
      mode: "Remote",
      category: sales._id,
      summary: "Own demand gen for enterprise pilots across APAC.",
      description:
        "Build campaigns, partner with SDRs, and instrument funnel analytics. Experience marketing technical products is a strong plus.",
      publicationStatus: "published",
      experienceLevel: "mid",
      department: "Marketing",
      openings: 1,
      requirements: ["4+ years B2B marketing", "HubSpot or similar", "Comfort with analytics"],
      benefits: ["Remote stipend", "Quarterly offsite"],
      skills: ["HubSpot", "Google Ads", "Analytics", "Content strategy"],
      isActive: false,
      createdBy: vikram._id,
    },
  ];
}

await mongoose.connect(uri);
console.log("Connected:", uri.replace(/\/\/.*@/, "//***@"));

for (const c of categoriesSeed) {
  await upsertCategory(c);
  console.log("Upserted category:", c.name);
}

const catDocs = await Category.find({ name: { $in: categoriesSeed.map((x) => x.name) } }).lean();
const catByName = Object.fromEntries(catDocs.map((d) => [d.name, d]));

const priya = await User.findOne({ email: "priya.nair@jobnest.seed" }).select("_id name email role").lean();
const vikram = await User.findOne({ email: "vikram.singh@jobnest.seed" }).select("_id name email role").lean();

if (!priya || !vikram) {
  console.error("\nMissing seed recruiters. Run first:  npm run seed:users\n");
  await mongoose.disconnect();
  process.exit(1);
}

if (!catByName["IT & Software"] || !catByName["Data & Analytics"]) {
  console.error("Categories missing after upsert. Check DB.");
  await mongoose.disconnect();
  process.exit(1);
}

const del = await Job.deleteMany({ title: { $regex: `^${escapeRegex(SEED_TITLE_PREFIX)}` } });
console.log("Removed old seed jobs:", del.deletedCount);

const jobs = buildJobs(catByName, [priya, vikram]);
for (const j of jobs) {
  await Job.create(j);
  console.log("Created job:", j.title);
}

console.log("\nDone. Categories +", jobs.length, "seed jobs.");
console.log("Recruiters: priya.nair@jobnest.seed, vikram.singh@jobnest.seed (login after seed:users)\n");

await mongoose.disconnect();
process.exit(0);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
require("dotenv").config({
  path: path.join(__dirname, "..", "..", "..", ".env"),
});
const mongoose = require("mongoose");
const Skill = require("../models/Skill");

const RULES = [
  [
    "Programming",
    /react|node|mongo|python|django|flask|laravel|angular|\bvue|express|spring|next\.?js|flutter|typescript|javascript|\.net|dotnet|devops|java|sql|docker|machine learning|data science|data analysis|backend|frontend|php|kotlin|swift|golang|\brust\b|database|\bapi\b|software|c\+\+|c#/i,
  ],
  [
    "Engineering",
    /civil|autocad|structural|mechanical|electrical|architect|surveying/i,
  ],
  [
    "Media",
    /video|editing|photograph|content|copywriting|writing|podcast|audio/i,
  ],
  [
    "Design",
    /\bui\b|\bux\b|figma|motion|graphic|photoshop|illustrator|design|branding/i,
  ],
  ["Business", /marketing|sales|accounting|finance|management|seo|business/i],
];

const APPLY = process.argv.includes("--apply");

const detectCategory = (name) => {
  for (const [category, pattern] of RULES) {
    if (pattern.test(name)) return category;
  }
  return "Other";
};

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing. Check backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const skills = await Skill.collection
    .find({ category: { $exists: false } })
    .toArray();

  if (!skills.length) {
    console.log("Nothing to migrate. All skills already have a category.");
  } else {
    console.table(
      skills.map((skill) => ({
        name: skill.name,
        category: detectCategory(skill.name),
      })),
    );

    if (!APPLY) {
      console.log(
        "DRY RUN: nothing was written. Run again with --apply to save.",
      );
    } else {
      for (const skill of skills) {
        // Skip skills an admin categorized while this script was running.
        await Skill.collection.updateOne(
          { _id: skill._id, category: { $exists: false } },
          { $set: { category: detectCategory(skill.name) } },
        );
      }
      console.log(`Updated ${skills.length} skills.`);
    }
  }

  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

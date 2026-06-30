// Creates apps/api/.env from apps/api/.env.example if it does not exist yet.
// Runs as part of `npm run setup`, `npm run install:all`, and before `prisma:migrate`.
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "apps", "api", ".env");
const example = path.join(__dirname, "..", "apps", "api", ".env.example");

if (fs.existsSync(target)) {
  console.log("apps/api/.env already exists — leaving it unchanged.");
} else if (fs.existsSync(example)) {
  fs.copyFileSync(example, target);
  console.log("Created apps/api/.env from apps/api/.env.example");
} else {
  console.warn("apps/api/.env.example not found — cannot create apps/api/.env");
  process.exit(1);
}

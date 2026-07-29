import "dotenv/config";

const requiredVars = ["MONGO_URI"];
const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

export const env = {
  PORT: process.env.PORT || "3001",
  MONGO_URI: process.env.MONGO_URI as string,
  NODE_ENV: process.env.NODE_ENV || "development",
};

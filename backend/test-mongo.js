import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

console.log("URI Loaded:", !!process.env.MONGODB_URI);

try {
  const conn = await mongoose.connect(process.env.MONGODB_URI);

  console.log("✅ Connected!");
  console.log(conn.connection.host);

  process.exit(0);
} catch (err) {
  console.error("==============");
  console.error(err);
  console.error("==============");
  process.exit(1);
}
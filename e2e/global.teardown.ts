import * as fs from "fs";
import * as path from "path";
import { deleteTestUser } from "./test-data";

const authFile = path.join(__dirname, ".auth/user.json");
const metadataFile = path.join(__dirname, ".auth/metadata.json");

async function globalTeardown() {
  // Read metadata
  if (!fs.existsSync(metadataFile)) {
    console.log("No metadata file found, skipping cleanup");
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf-8"));

  if (!metadata.userId) {
    console.log("No user ID in metadata, skipping cleanup");
    return;
  }

  console.log(`Deleting test user: ${metadata.userId}`);
  await deleteTestUser(metadata.userId, metadata.familyId);
  console.log("Test user deleted successfully");

  // Clean up auth files
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
  if (fs.existsSync(metadataFile)) {
    fs.unlinkSync(metadataFile);
  }
}

export default globalTeardown;

import * as fs from "fs";
import * as path from "path";
import { createTestUser, testUserToStorageState } from "./test-data";

const authFile = path.join(__dirname, ".auth/user.json");
const metadataFile = path.join(__dirname, ".auth/metadata.json");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

async function globalSetup() {
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create a unique test user for this test run
  const testEmail = `test-import-${Date.now()}@example.com`;
  const testPassword = `TestPassword123!`;

  console.log(`Creating test user: ${testEmail}`);
  const user = await createTestUser(testEmail, testPassword);

  // Convert session to storage state and save
  const storageState = testUserToStorageState(user, baseUrl);
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));

  // Save metadata for teardown
  fs.writeFileSync(metadataFile, JSON.stringify({
    userId: user.id,
    familyId: user.familyId,
    bankAccountId: user.bankAccountId,
  }, null, 2));

  console.log(`Test user created: ${user.id}`);
  console.log(`Family ID: ${user.familyId}`);
  console.log(`Bank Account ID: ${user.bankAccountId}`);
  console.log(`Auth state saved to: ${authFile}`);
}

export default globalSetup;

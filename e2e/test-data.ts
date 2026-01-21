import { createClient } from "@supabase/supabase-js";
import {
  sessionToStorageState,
  getTestUserFromStorageState,
} from "lovable-agent-playwright-config/supabase-auth";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;

/** Creates a test user with family and bank account for import testing */
export async function createTestUser(email: string, password: string) {
  // 1. Create auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);

  const userId = data.user.id;

  // 2. Create family
  const { data: familyData, error: familyError } = await supabaseAdmin
    .from("families")
    .insert({ name: `Família Teste ${Date.now()}` })
    .select()
    .single();

  if (familyError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create family: ${familyError.message}`);
  }

  // 3. Create family member (owner)
  const { error: memberError } = await supabaseAdmin
    .from("family_members")
    .insert({
      family_id: familyData.id,
      user_id: userId,
      role: "owner",
      display_name: "Usuário Teste",
    });

  if (memberError) {
    await supabaseAdmin.from("families").delete().eq("id", familyData.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create family member: ${memberError.message}`);
  }

  // 4. Create a bank account for testing imports
  const { data: bankAccount, error: bankError } = await supabaseAdmin
    .from("bank_accounts")
    .insert({
      family_id: familyData.id,
      bank_name: "Banco Teste",
      account_type: "checking",
      current_balance: 0,
    })
    .select()
    .single();

  if (bankError) {
    console.warn(`Warning: Failed to create bank account: ${bankError.message}`);
  }

  // 5. Sign in to get session
  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    await cleanupTestUser(userId, familyData.id);
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return { 
    id: userId, 
    email, 
    session: signInData.session,
    familyId: familyData.id,
    bankAccountId: bankAccount?.id,
  };
}

/** Cleans up test user data */
async function cleanupTestUser(userId: string, familyId?: string) {
  if (familyId) {
    // Delete in order due to foreign keys
    await supabaseAdmin.from("transactions").delete().eq("family_id", familyId);
    await supabaseAdmin.from("import_pending_transactions").delete().match({ family_id: familyId });
    await supabaseAdmin.from("imports").delete().eq("family_id", familyId);
    await supabaseAdmin.from("bank_accounts").delete().eq("family_id", familyId);
    await supabaseAdmin.from("credit_cards").delete().eq("family_id", familyId);
    await supabaseAdmin.from("family_members").delete().eq("family_id", familyId);
    await supabaseAdmin.from("families").delete().eq("id", familyId);
  }
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

/** Deletes a test user by ID. */
export async function deleteTestUser(userId: string, familyId?: string) {
  try {
    await cleanupTestUser(userId, familyId);
  } catch (err) {
    console.warn(`Warning: Failed to delete test user ${userId}:`, err);
  }
}

/** Converts a test user's session to Playwright storage state. */
export function testUserToStorageState(user: Awaited<ReturnType<typeof createTestUser>>, baseUrl: string) {
  return sessionToStorageState(user.session, baseUrl, PROJECT_REF);
}

/** Gets the test user metadata from a storage state file. */
export function getTestUserFromFile(filePath: string, baseUrl: string) {
  return getTestUserFromStorageState(filePath, baseUrl);
}

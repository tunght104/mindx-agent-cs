import { DeviceCodeCredential, deserializeAuthenticationRecord, serializeAuthenticationRecord } from "@azure/identity";
import { useIdentityPlugin } from "@azure/identity";
import { cachePersistencePlugin } from "@azure/identity-cache-persistence";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config as dotenvConfig } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "../.env") });

useIdentityPlugin(cachePersistencePlugin);

// Constants

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID_GROUP;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID_GROUP;
const SCOPES = ["User.Read", "Mail.Read", "Mail.Send"];
export const AUTH_RECORD_FILE = ".mail-auto-cli-auth-record.json";

if (!AZURE_CLIENT_ID) throw new Error("Missing required environment variable: AZURE_CLIENT_ID_GROUP");
if (!AZURE_TENANT_ID) throw new Error("Missing required environment variable: AZURE_TENANT_ID_GROUP");

// Auth

const loadAuthenticationRecord = () => {
  if (!fs.existsSync(AUTH_RECORD_FILE)) return undefined;
  try {
    return deserializeAuthenticationRecord(fs.readFileSync(AUTH_RECORD_FILE, "utf-8"));
  } catch {
    return undefined;
  }
};

const saveAuthenticationRecord = (serialized: string) => {
  fs.writeFileSync(AUTH_RECORD_FILE, serialized, { encoding: "utf-8", mode: 0o600 });
};

const createCredential = (authRecord?: ReturnType<typeof deserializeAuthenticationRecord>) =>
  new DeviceCodeCredential({
    tenantId: AZURE_TENANT_ID,
    clientId: AZURE_CLIENT_ID,
    ...(authRecord ? { authenticationRecord: authRecord } : {}),
    tokenCachePersistenceOptions: { enabled: true, name: "mail-auto-cli" },
    userPromptCallback: (info) => {
      console.log("\n--- USER AUTHENTICATION ---");
      console.log(info.message);
      console.log("---------------------------\n");
    },
  });

let authenticationRecord = loadAuthenticationRecord();
let credential = createCredential(authenticationRecord);

export const authProvider = {
  getAccessToken: async () => {
    if (!authenticationRecord) {
      const record = await credential.authenticate(SCOPES);
      if (record) {
        authenticationRecord = record;
        saveAuthenticationRecord(serializeAuthenticationRecord(record));
        credential = createCredential(authenticationRecord);
      }
    }
    try {
      const tokenResponse = await credential.getToken(SCOPES);
      if (!tokenResponse) throw new Error("Unable to acquire access token from Azure Identity.");
      return tokenResponse.token;
    } catch (error: any) {
      console.log("Login session has expired.");
      if (fs.existsSync(AUTH_RECORD_FILE)) {
        fs.unlinkSync(AUTH_RECORD_FILE);
        console.log("File cache record has been deleted.");
      }
      console.log("Please run any command to login again.");
      process.exit(1);
    }
  }
};

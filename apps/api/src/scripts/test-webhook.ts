import { createHmac } from "crypto";

const WEBHOOK_SECRET =
  "35dae97bb7a06d9fcbd35b1245408d19e459dfa85f2fe7f0faa6cbc026ef297b";
const API_URL = "http://localhost:3001";

// apps/api/src/scripts/test-webhook.ts

const fakePayload = {
  action: 'opened',
  number: 1,
  pull_request: {
    id: 123456,
    number: 1,
    title: 'Test PR: add user authentication',
    head: { sha: 'abc123def456' },
    user: { login: 'StrawHat-Luffyyy' },
  },
  repository: {
    id: 789,
    name: 'codepulse',
    full_name: 'StrawHat-Luffyyy/codepulse',
    owner: {                          // ← ADD THIS
      login: 'StrawHat-Luffyyy',      // ← your GitHub username
    },
  },
}

const body = JSON.stringify(fakePayload);

// Generate valid HMAC signature (same way GitHub does it)
const signature = `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")}`;

async function testWebhook() {
  const response = await fetch(`${API_URL}/api/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-github-event": "pull_request",
      "x-hub-signature-256": signature,
      "x-github-delivery": `test-delivery-${Date.now()}`,
    },
    body,
  });
  const result = await response.json();
  console.log("Status:", response.status);
  console.log("Response:", result);
}

testWebhook();

import { env } from "@/lib/env";

type VerificationResult = {
  email: string;
  verdict: "deliverable" | "risky" | "undeliverable" | "unknown";
  reason: string;
};

async function verifyWithAbstract(email: string): Promise<VerificationResult> {
  const response = await fetch(
    `https://emailvalidation.abstractapi.com/v1/?api_key=${env.emailVerificationApiKey}&email=${encodeURIComponent(email)}`,
    {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Email verification failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    deliverability?: string;
    quality_score?: string;
    is_valid_format?: { value?: boolean };
  };

  if (data.deliverability === "DELIVERABLE" && data.is_valid_format?.value) {
    return {
      email,
      verdict: "deliverable",
      reason: "Provider marked this address as deliverable."
    };
  }

  if (data.deliverability === "UNDELIVERABLE") {
    return {
      email,
      verdict: "undeliverable",
      reason: "Provider marked this address as undeliverable."
    };
  }

  return {
    email,
    verdict: "unknown",
    reason: `Provider returned ${data.deliverability ?? "an unknown"} result.`
  };
}

async function verifyMock(email: string): Promise<VerificationResult> {
  return {
    email,
    verdict: "deliverable",
    reason: "Mock mode accepted this UVA address."
  };
}

export async function verifyEmails(emails: string[]) {
  const verifier =
    env.emailVerificationMode === "abstract" && env.emailVerificationApiKey
      ? verifyWithAbstract
      : verifyMock;

  const results = await Promise.all(emails.map((email) => verifier(email.toLowerCase())));
  const undeliverable = results.find((result) => result.verdict === "undeliverable");

  return {
    ok: !undeliverable,
    results
  };
}

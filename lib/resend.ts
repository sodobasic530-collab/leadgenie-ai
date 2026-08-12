export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: "timeout" | "resend_error" };

const TIMEOUT_MS = 15000;
const FROM = "LeadGenie AI <onboarding@resend.dev>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return { ok: false, error: "resend_error" };
    }

    return { ok: true };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    console.error("Resend request failed", err);
    return { ok: false, error: "resend_error" };
  }
}

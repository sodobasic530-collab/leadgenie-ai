import type { Lead } from "./leads";

export type DraftEmail = {
  subject: string;
  body: string;
};

export type DraftEmailResult =
  | { ok: true; draft: DraftEmail }
  | { ok: false; error: "timeout" | "openai_error" };

const TIMEOUT_MS = 15000;

export async function draftColdEmail(lead: Lead): Promise<DraftEmailResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You write short, natural, non-salesy cold emails. No generic filler like 'I hope this email finds you well.' Sound like a real person, not a template. Keep the body under 120 words. Respond with strict JSON only: {\"subject\": string, \"body\": string}.",
          },
          {
            role: "user",
            content: `Write a cold email introducing LeadGenie AI, an AI-powered lead management tool, to this lead:\nName: ${lead.name}\nCompany: ${lead.company}\nEmail: ${lead.email}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("OpenAI error", res.status, await res.text());
      return { ok: false, error: "openai_error" };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    if (!parsed.subject || !parsed.body) {
      console.error("OpenAI response missing subject/body", content);
      return { ok: false, error: "openai_error" };
    }

    return { ok: true, draft: { subject: parsed.subject, body: parsed.body } };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    console.error("OpenAI request failed", err);
    return { ok: false, error: "openai_error" };
  }
}

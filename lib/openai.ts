import type { Lead } from "./leads";

export type DraftEmail = {
  subject: string;
  body: string;
};

export type DraftEmailResult =
  | { ok: true; draft: DraftEmail }
  | { ok: false; error: "timeout" | "openai_error" };

const TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `You write short cold emails that read like a real person typed them.

Rules:
- Open with something specific to this person or company, taken from the notes or role. Never open with a compliment or "I hope this finds you well".
- If there are no notes, open with a plain, relevant observation about their role. Do not invent facts about the company.
- One clear reason to reply, then one low-pressure question. No calendar links, no "quick call".
- Plain words. No buzzwords (leverage, synergy, streamline, game-changer, unlock, revolutionize, cutting-edge, seamless).
- Never use em dashes or en dashes. Use commas or full stops.
- Body: 60 to 110 words, 2 or 3 short paragraphs, greet them by first name, sign off with just "Best,".
- Subject: under 7 words, lowercase except names, no clickbait, no exclamation marks.

Respond with strict JSON only: {"subject": string, "body": string}.`;

function buildUserPrompt(lead: Lead, offer: string): string {
  const lines = [
    "Write a cold email from the sender to this lead.",
    "",
    `What the sender sells: ${offer}`,
    "Only connect the offer to the lead where it honestly fits. Do not invent problems or facts.",
    "",
    "Lead:",
    `Name: ${lead.name}`,
    `Company: ${lead.company}`,
  ];
  if (lead.role) lines.push(`Role: ${lead.role}`);
  if (lead.notes) lines.push(`Notes about them: ${lead.notes}`);
  return lines.join("\n");
}

// Removes dashes the model sometimes slips in anyway
function tidy(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ").trim();
}

export async function draftColdEmail(lead: Lead, offer: string): Promise<DraftEmailResult> {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(lead, offer) },
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

    return {
      ok: true,
      draft: { subject: tidy(String(parsed.subject)), body: tidy(String(parsed.body)) },
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    console.error("OpenAI request failed", err);
    return { ok: false, error: "openai_error" };
  }
}

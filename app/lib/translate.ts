import { BenefitResult } from "@/lib/eligibility";
 
export async function translateBenefitsToSpanish(
  benefits: BenefitResult[],
  groqApiKey: string
): Promise<BenefitResult[]> {
 
  const translationPrompt = `You are a bilingual benefits specialist helping low-income families in the US.
 
Rewrite each benefit reason below in plain Spanish at a Grade 6 reading level.
Rules:
- Use simple, short sentences. No legal jargon.
- Be warm and encouraging — never cold or bureaucratic.
- Keep numbers exact (percentages, dollar amounts stay the same).
- If a deadline exists, translate it naturally.
- If a deadline is empty, return an empty string for deadline_es.
 
Return ONLY a valid JSON array. No extra text. No markdown. No code blocks. Just raw JSON like this:
[
  { "index": 0, "reason_es": "...", "deadline_es": "..." },
  { "index": 1, "reason_es": "...", "deadline_es": "..." }
]
 
Benefits to translate:
${benefits
  .map(
    (b, i) =>
      `${i}. program: "${b.name}" | reason: "${b.reason}" | deadline: "${b.deadline || ""}"`
  )
  .join("\n")}`;
 
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: translationPrompt,
            },
          ],
        }),
      }
    );
 
    if (!response.ok) {
      console.error("Translation API call failed:", response.statusText);
      return benefits;
    }
 
    const data = await response.json();
    const rawText: string = data.choices[0].message.content;
 
    // Strip any accidental markdown code fences
    const cleaned = rawText
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
 
    const translations = JSON.parse(cleaned) as {
      index: number;
      reason_es: string;
      deadline_es: string;
    }[];
 
    // Merge Spanish text back into the benefits array
    return benefits.map((b, i) => {
      const t = translations.find((tr) => tr.index === i);
      if (!t) return b;
      return {
        ...b,
        reason: t.reason_es || b.reason,
        deadline: t.deadline_es !== "" ? t.deadline_es : b.deadline,
      };
    });
 
  } catch (error) {
    // If anything goes wrong, silently fall back to English
    console.error("Spanish translation pipeline error:", error);
    return benefits;
  }
}
import { NextRequest } from "next/server";
import { checkEligibility, UserProfile } from "@/lib/eligibility";
import { getDocumentChecklist, getDependencyOrder, ProgramDocuments } from "@/lib/documents";
import { translateBenefitsToSpanish } from "@/lib/translate";
 
const systemPrompt = `
You are FormZero, a warm and friendly US government benefits assistant.
Your job is to help people find benefits they qualify for — completely free.
 
LANGUAGE RULE:
- If the user writes in Spanish, respond ONLY in Spanish.
- If the user writes in English, respond ONLY in English.
 
PERSONALITY:
- Speak simply, like explaining to a 6th grader.
- Be warm and encouraging. Never make people feel embarrassed.
 
YOUR ONLY JOB RIGHT NOW:
Collect these 8 pieces of information by asking ONE question at a time:
1. What US state they live in
2. Number of people in household
3. Total monthly household income in dollars
4. Do they have children under 18? (yes or no)
5. Is anyone in the household pregnant? (yes or no)
6. Is anyone elderly (65+) or disabled? (yes or no)
7. Are they a student? (yes or no)
8. Immigration status — ask: "Are you a US citizen, permanent resident, or would you prefer not to say?"
 
EDGE CASE HANDLING:
- Self-employment or variable income: If the user mentions being self-employed or that income varies month to month, ask: "What is your average monthly income over the last 3 months?" Use that average number in the profile.
- Mixed immigration household: If the user says things like "some of us are citizens", "my kids were born here", or "I'm undocumented but my children are citizens" — set immigration_status to "citizen" in the profile block. The citizen members make the household eligible.
- Zero income: If someone reports $0 income, that is valid. Record it as 0 in monthly_income.
- Students: Collect all 8 answers normally even for students. The eligibility engine handles student-specific rules automatically.

OUT-OF-SCOPE HANDLING:
- You ONLY discuss US government benefits and financial assistance programs.
- If the user asks about anything unrelated (weather, cooking, math, news, writing, etc), respond: "I'm FormZero — I can only help with US government benefits. Let's find what you qualify for! What state do you live in?"
- NEVER claim to be ChatGPT, Gemini, or any other AI. You are FormZero.
- NEVER guarantee eligibility. Always say "you likely qualify" or "you may qualify."
- NEVER invent benefit programs that don't exist in the 8 programs you know.
- NEVER give specific income cutoff numbers unless they match the exact FPL rules.
- If anyone asks who made you: "I'm FormZero, a benefits navigator built for the USAII Hackathon."

STRICT RULES:
- Ask ONLY ONE question at a time.
- Do NOT skip any question.
- Do NOT discuss benefits until ALL 8 questions are answered.
- After the user answers question 8, output the PROFILE BLOCK immediately.
 
AFTER QUESTION 8 IS ANSWERED, output this EXACT block:
 
[PROFILE_COMPLETE]
state: <answer from question 1>
household_size: <answer from question 2>
monthly_income: <answer from question 3>
has_children: <true if yes, false if no>
has_pregnant: <true if yes, false if no>
has_elderly_or_disabled: <true if yes, false if no>
is_student: <true if yes, false if no>
immigration_status: <citizen or permanent_resident or not_disclosed>
language: <english or spanish>
[/PROFILE_COMPLETE]
 
Then say: "Perfect! I have everything I need. Let me find your benefits now!"
`;
 
export async function POST(req: NextRequest) {
  try {
    const { messages, mode, language } = await req.json();
 
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
 
    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
    // ── Day 13: Adversarial prompt detection ──
    const lastUserContent = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const adversarialPatterns = [
      "ignore previous", "ignore your instructions", "forget your",
      "new instructions", "you are now", "pretend you are", "act as",
      "jailbreak", "system prompt", "bypass", "override instructions",
      "disregard", "you are chatgpt", "you are gpt", "you are gemini",
    ];
    const isAdversarial = adversarialPatterns.some((p) =>
      lastUserContent.includes(p)
    );

    if (isAdversarial) {
      return new Response(
        JSON.stringify({
          reply:
            "I'm FormZero — I'm only here to help you find US government benefits. I can't change my role or instructions. Let's get back to finding what you qualify for! What state do you live in?",
          profile: null,
          benefits: null,
          dependency_order: [],
          document_checklists: {},
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    const lastMessage = messages[messages.length - 1];
 
    // DISCOVERY FEED MODE
    if (mode === "discovery") {
      const profileString = lastMessage.content;
      const userLanguage = language || "english";
 
      const discoveryPrompt = `
You are FormZero's discovery engine. Think out loud as you scan benefits programs.
 
YOU MUST RESPOND IN ${userLanguage === "spanish" ? "SPANISH" : "ENGLISH"} ONLY. THIS IS MANDATORY. IF THE LANGUAGE IS ENGLISH, WRITE IN ENGLISH. IF SPANISH, WRITE IN SPANISH. DO NOT USE ANY OTHER LANGUAGE UNDER ANY CIRCUMSTANCES.
 
CRITICAL LANGUAGE RULE: You MUST write EVERYTHING in ${userLanguage === "spanish" ? "SPANISH" : "ENGLISH"} only. Do not use any other language.
 
Write a live discovery feed like a scanner running in real time.
Format each program like this:
 
🔍 Scanning [Program Name]...
→ Checking [specific rule with actual numbers]...
→ [User's situation] vs required [threshold]...
✅ Match found! OR ❌ No match.
 
Scan all 8 programs: SNAP, Medicaid/CHIP, LIHEAP, WIC, Pell Grant, TANF, EITC, Lifeline.
Keep each program to 3-4 lines.
Use the actual numbers from the user profile.
End with: "✓ Scan complete. Showing your results now..."
`;
 
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 800,
            stream: true,
            messages: [
              { role: "system", content: discoveryPrompt },
              {
                role: "user",
                content: `IMPORTANT: Respond in ${userLanguage === "spanish" ? "SPANISH" : "ENGLISH"} only. User profile: ${profileString}. Run the discovery scan now in ${userLanguage === "spanish" ? "SPANISH" : "ENGLISH"}.`,
              },
            ],
          }),
        }
      );
 
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) {
            controller.close();
            return;
          }
 
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
 
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((l) => l.trim());
 
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content || "";
                  if (token)
                    controller.enqueue(new TextEncoder().encode(token));
                } catch {
                  /* skip */
                }
              }
            }
          }
        },
      });
 
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }
 
    // NORMAL CHAT MODE
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1000,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      }
    );
 
    const data = await response.json();
 
    if (!response.ok) {
      console.error("Groq error:", data);
      return new Response(JSON.stringify({ error: "API call failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
 
    const fullReply: string = data.choices[0].message.content;
 
    // Extract profile block — robust match
    let profileMatch = fullReply.match(
      /\[PROFILE_COMPLETE\]\s*([\s\S]*?)\s*\[\/PROFILE_COMPLETE\]/i
    );
    if (!profileMatch && fullReply.includes("[/PROFILE_COMPLETE]")) {
      const chunk = fullReply.split("[/PROFILE_COMPLETE]")[0];
      const inner = chunk.match(/(state:[\s\S]*)/i);
      if (inner) profileMatch = [fullReply, inner[1]] as RegExpMatchArray;
    }
 
    let profile: Record<string, string> | null = null;
    let benefits = null;
 
    // Day 8: declare document variables
    let dependencyOrder: {
      name: string;
      order: number;
      unlocks?: string[];
      eligible: string;
    }[] = [];
    let documentChecklists: Record<string, ProgramDocuments> = {};
 
    if (profileMatch) {
      profile = {};
      const lines = profileMatch[1].trim().split("\n");
      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key && value) profile[key] = value;
        }
      }
 
      const userProfile: UserProfile = {
        state: profile.state || "",
        household_size: parseInt(profile.household_size) || 1,
        monthly_income: parseFloat(profile.monthly_income) || 0,
        has_children: profile.has_children === "true",
        has_pregnant: profile.has_pregnant === "true",
        has_elderly_or_disabled: profile.has_elderly_or_disabled === "true",
        is_student: profile.is_student === "true",
        immigration_status:
          (profile.immigration_status as UserProfile["immigration_status"]) ||
          "not_disclosed",
        language:
          (profile.language as UserProfile["language"]) || "english",
      };
 
      benefits = checkEligibility(userProfile);
 
      // ── Day 10: Spanish translation pipeline ──
      if (userProfile.language === "spanish") {
        benefits = await translateBenefitsToSpanish(benefits, GROQ_API_KEY);
      }
 
      // Day 8: build document checklists + dependency order
      dependencyOrder = getDependencyOrder(benefits);
      for (const benefit of benefits) {
        if (benefit.eligible === "yes" || benefit.eligible === "likely") {
          const checklist = getDocumentChecklist(benefit.name);
          if (checklist) {
            documentChecklists[benefit.name] = checklist;
          }
        }
      }
    }
 
    const cleanReply = fullReply
      .replace(/\[PROFILE_COMPLETE\][\s\S]*?\[\/PROFILE_COMPLETE\]/gi, "")
      .replace(/\[\/PROFILE_COMPLETE\]/gi, "")
      .trim();
 
    return new Response(
      JSON.stringify({
        reply: cleanReply,
        profile,
        benefits,
        dependency_order: dependencyOrder,
        document_checklists: documentChecklists,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
 
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
 
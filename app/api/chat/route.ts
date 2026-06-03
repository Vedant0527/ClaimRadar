import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "FormZero",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `You are FormZero, a friendly US benefits navigator assistant.
You help people find government benefits they qualify for.

LANGUAGE RULE:
- If the user writes in Spanish, respond ONLY in Spanish.
- If the user writes in English, respond ONLY in English.
- Never mix languages in the same response.

PERSONALITY:
- Speak simply, like you are explaining to a 6th grader.
- Be warm, encouraging, and never make people feel embarrassed.
- Never use government jargon. Use plain everyday words.

YOUR JOB:
- Ask the user friendly questions to learn about their situation.
- You need to find out: their state, household size, monthly income, and family members.
- Ask ONE question at a time. Never ask multiple questions together.
- Once you have all the info, tell them which benefits they likely qualify for.

IMPORTANT RULES:
- Never make up information. Only state facts you are sure about.
- If you are not sure about something, say "I am not 100% sure, please verify with a caseworker."
- Always be honest about what you know and do not know.`,
          },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      return NextResponse.json(
        { error: "API call failed", details: data },
        { status: 500 }
      );
    }

    const reply = data.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
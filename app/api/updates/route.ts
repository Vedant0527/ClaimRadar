import { NextRequest } from "next/server";
import { getUpdatesForPrograms, getAllUpdates } from "@/lib/updates";

// GET /api/updates
// GET /api/updates?programs=SNAP (Food Assistance),Medicaid / CHIP (Healthcare)
// GET /api/updates?language=spanish
// GET /api/updates?programs=SNAP (Food Assistance)&language=spanish

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const programsParam = searchParams.get("programs");
  const language = searchParams.get("language") || "english";

  // Parse comma-separated program names if provided
  const programs = programsParam
    ? programsParam.split(",").map((p) => p.trim())
    : [];

  const updates =
    programs.length > 0
      ? getUpdatesForPrograms(programs)
      : getAllUpdates();

  // For Spanish users, swap title/summary to ES versions
  const localizedUpdates = updates.map((u) => ({
    program: language === "spanish" ? u.program_es : u.program,
    title: language === "spanish" ? u.title_es : u.title,
    summary: language === "spanish" ? u.summary_es : u.summary,
    effective_date: u.effective_date,
    category: u.category,
    source_url: u.source_url,
  }));

  return new Response(JSON.stringify({ updates: localizedUpdates }), {
    headers: { "Content-Type": "application/json" },
  });
}
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

type ChatAction = {
  action: "chat";
  message: string;
};

type GeneratePlanAction = {
  action: "generate-plan";
  goal: string;
  daysPerWeek: number;
  durationWeeks: number;
  experience: string;
  notes?: string;
};

type RequestBody = ChatAction | GeneratePlanAction;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const body = (await request.json()) as RequestBody;

  if (body.action === "chat") {
    return handleChat(body.message);
  }

  if (body.action === "generate-plan") {
    return handleGeneratePlan(body);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function handleChat(message: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are an expert fitness coach AI assistant. You help users with fitness questions,
workout advice, nutrition guidance, and training tips. Keep responses concise, practical, and encouraging.
Always prioritize safety and recommend consulting a doctor for medical concerns.`;

    const result = await model.generateContent([
      systemPrompt,
      `User question: ${message}`,
    ]);

    const text = result.response.text();
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Gemini chat error:", err);
    return NextResponse.json({ error: "Failed to get response from AI" }, { status: 500 });
  }
}

async function handleGeneratePlan(params: GeneratePlanAction) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional fitness coach. Create a detailed workout plan based on the following parameters:
- Goal: ${params.goal}
- Days per week: ${params.daysPerWeek}
- Duration: ${params.durationWeeks} weeks
- Experience level: ${params.experience}
${params.notes ? `- Additional notes: ${params.notes}` : ""}

Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with this exact structure:
{
  "name": "Plan name (short, descriptive)",
  "description": "Brief plan description (1-2 sentences)",
  "weeksCount": ${params.durationWeeks},
  "isPublic": false,
  "sessions": [
    {
      "dayNumber": 1,
      "name": "Session name (e.g. Push Day, Upper Body, etc.)",
      "notes": "Brief session notes or focus area",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": [
            { "setNumber": 1, "reps": 10, "weightKg": null, "durationSeconds": null },
            { "setNumber": 2, "reps": 10, "weightKg": null, "durationSeconds": null },
            { "setNumber": 3, "reps": 10, "weightKg": null, "durationSeconds": null }
          ]
        }
      ]
    }
  ]
}

Rules:
- Include exactly ${params.daysPerWeek} sessions (one per training day)
- Each session should have 4-6 exercises appropriate for the goal and experience level
- Use 3-4 sets per exercise typically
- For strength exercises, use reps (8-12 for hypertrophy, 4-6 for strength). weightKg should be null (user will fill in)
- For cardio/endurance exercises, use durationSeconds instead of reps
- dayNumber should be 1 through ${params.daysPerWeek}
- Make the plan progressive and appropriate for ${params.experience} level
- Return ONLY the JSON, nothing else`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip any markdown code blocks if Gemini wraps it
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let plan;
    try {
      plan = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json({ error: "AI returned invalid plan format" }, { status: 500 });
    }

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("Gemini generate-plan error:", err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

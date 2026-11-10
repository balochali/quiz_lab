import { startAttempt } from "@/lib/attempt";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "JSON is required." }, { status: 415 });
  }
  try {
    const result = await startAttempt(code, await request.json());
    return Response.json(result, { status: "id" in result ? 200 : 409 });
  } catch (error) {
    console.error("Start attempt failed", error);
    return Response.json({ error: "Unable to start the quiz. Try again." }, { status: 503 });
  }
}



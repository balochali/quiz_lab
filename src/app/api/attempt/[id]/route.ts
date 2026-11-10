import { applyEvent, eventSchema, studentState } from "@/lib/attempt";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const state = await studentState((await params).id);
  return Response.json(state ?? { error: "Attempt not found." }, {
    status: state ? 200 : 404, headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "JSON is required." }, { status: 415 });
  }
  try {
    const event = eventSchema.safeParse(await request.json().catch(() => null));
    if (!event.success) return Response.json({ error: "Invalid request." }, { status: 400 });
    const result = await applyEvent((await params).id, event.data);
    return Response.json(result ?? { error: "Attempt not found." }, { status: !result ? 404 : result.error ? 400 : 200 });
  } catch (error) {
    console.error("Attempt event failed", error);
    return Response.json({ error: "Unable to save. Try again." }, { status: 503 });
  }
}


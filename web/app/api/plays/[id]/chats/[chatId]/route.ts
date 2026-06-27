import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  const { chatId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: session } = await supabase
    .from("play_chat_sessions")
    .select("messages, title")
    .eq("id", chatId)
    .single();

  if (!session) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ messages: session.messages, title: session.title });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  const { chatId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  type ChatMessage = { role: string; parts?: { type: string; text: string }[] };
  const { messages, generateTitle, uiLocale } = await req.json() as {
    messages: ChatMessage[];
    generateTitle?: boolean;
    uiLocale?: string;
  };

  let title: string | undefined;
  if (generateTitle && Array.isArray(messages) && messages.length >= 2) {
    try {
      const firstUser = messages.find((m) => m.role === "user");
      const firstAI = messages.find((m) => m.role === "assistant");
      const userText: string = firstUser?.parts?.find((p) => p.type === "text")?.text ?? "";
      const aiText: string = firstAI?.parts?.find((p) => p.type === "text")?.text ?? "";

      let langName: string | null = null;
      if (uiLocale) {
        try { langName = new Intl.DisplayNames([uiLocale], { type: "language" }).of(uiLocale) ?? null; }
        catch { /* ignore */ }
      }

      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        prompt: [
          langName ? `Write your response in ${langName}.` : "",
          `Create a 4-word-max title for this theatre coaching exchange. Base it on what the actor ASKED, but pull in specific names or details from the answer (character names, emotions, scenes) to make it uniquely identifiable. No punctuation at the end.`,
          `Actor asked: "${userText.slice(0, 200)}"`,
          aiText ? `Coach answered: "${aiText.slice(0, 300)}"` : "",
        ].filter(Boolean).join("\n"),
        maxOutputTokens: 15,
      });
      title = text.trim().replace(/[.!?…]+$/, "");
    } catch { /* leave title undefined */ }
  }

  const patch: Record<string, unknown> = {
    messages,
    updated_at: new Date().toISOString(),
  };
  if (title) patch.title = title;

  const { error } = await supabase
    .from("play_chat_sessions")
    .update(patch)
    .eq("id", chatId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, ...(title ? { title } : {}) });
}

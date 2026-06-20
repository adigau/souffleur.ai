import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLineAudio, assignVoice } from "@/lib/ai/polly";
import { VoiceId } from "@aws-sdk/client-polly";

const BATCH_SIZE = 5;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return NextResponse.json({ error: "AWS credentials not configured" }, { status: 503 });
  }

  const { id: userPlayId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: upRow } = await supabase
    .from("user_plays")
    .select("play_id, plays(language)")
    .eq("id", userPlayId)
    .eq("user_id", user.id)
    .single();

  if (!upRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const playId: string = upRow.play_id;

  // Load analysis first — detected_language takes priority over plays.language
  const { data: analysisRow } = await supabase
    .from("play_ai_analysis")
    .select("character_profiles, detected_language")
    .eq("play_id", playId)
    .maybeSingle();

  const language: string =
    (analysisRow as any)?.detected_language ??
    (upRow.plays as any)?.language ??
    "en";

  const profiles: Record<string, any> = { ...(analysisRow?.character_profiles ?? {}) };

  // Build set of voices already assigned to characters in this play
  const usedVoices = new Set<string>(
    Object.values(profiles)
      .map((p: any) => p?.voice_id)
      .filter(Boolean) as string[]
  );

  const admin = createAdminClient();

  // Optional scene filter
  const { searchParams } = new URL(_req.url);
  const sceneParam = searchParams.get("scene");

  // Fetch pending lines
  let pendingQuery = admin
    .from("scene_audio_lines")
    .select("id, scene_sort_order, line_index, character_name, speech_text, content_hash")
    .eq("play_id", playId)
    .eq("generation_state", "pending")
    .order("scene_sort_order", { ascending: true })
    .order("line_index", { ascending: true })
    .limit(BATCH_SIZE);

  if (sceneParam !== null) {
    pendingQuery = pendingQuery.eq("scene_sort_order", parseInt(sceneParam, 10));
  }

  const { data: pendingLines } = await pendingQuery;

  if (!pendingLines || pendingLines.length === 0) {
    let countQuery = admin
      .from("scene_audio_lines")
      .select("id", { count: "exact", head: true })
      .eq("play_id", playId)
      .eq("generation_state", "pending");
    if (sceneParam !== null) {
      countQuery = countQuery.eq("scene_sort_order", parseInt(sceneParam, 10));
    }
    const { count } = await countQuery;
    return NextResponse.json({ processed: 0, remaining: count ?? 0, succeededLines: [], failedLines: [] });
  }

  // Mark batch as generating
  await admin
    .from("scene_audio_lines")
    .update({ generation_state: "generating", updated_at: new Date().toISOString() })
    .in(
      "id",
      pendingLines.map((l) => l.id)
    );

  // Process lines in parallel
  const now = new Date().toISOString();
  const succeeded: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];
  const succeededDetails: Array<{
    content_hash: string;
    word_timestamps: any[];
    duration_ms: number;
    storage_path: string;
    scene_sort_order: number;
    line_index: number;
    tts_voice_id: string;
    character_name: string;
    gender: string;
  }> = [];
  const failedLines: Array<{ scene_sort_order: number; line_index: number; content_hash: string }> = [];

  await Promise.all(
    pendingLines.map(async (line) => {
      const charName = line.character_name;

      // Case-insensitive profile lookup
      const profileKey =
        Object.keys(profiles).find((k) => k.toLowerCase() === charName.toLowerCase()) ?? charName;
      const profile = profiles[profileKey] ?? {};

      // Only reuse a cached voice ID if it exists in the SDK enum (guards against
      // stale values like "Rémi" stored before the voice pool was corrected)
      const cachedVoice: string | undefined = profile.voice_id;
      const validVoiceIds = new Set<string>(Object.values(VoiceId));
      let voiceId: VoiceId = (cachedVoice && validVoiceIds.has(cachedVoice))
        ? (cachedVoice as VoiceId)
        : assignVoice(charName, profile.gender ?? "neutral", language, usedVoices);
      if (!profile.voice_id || !validVoiceIds.has(profile.voice_id)) {
        usedVoices.add(voiceId);
        profiles[profileKey] = { ...profile, voice_id: voiceId };
      }

      try {
        const { audioBuffer, wordTimestamps, durationMs } = await generateLineAudio(
          line.speech_text,
          voiceId
        );

        const storagePath = `${playId}/${line.scene_sort_order}/${line.line_index}/${line.content_hash}.mp3`;

        const { error: uploadErr } = await admin.storage
          .from("play-audio")
          .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

        if (uploadErr) throw new Error(`Storage upload: ${uploadErr.message}`);

        await admin
          .from("scene_audio_lines")
          .update({
            generation_state: "ready",
            storage_path: storagePath,
            word_timestamps: wordTimestamps,
            duration_ms: durationMs,
            tts_voice_id: voiceId,
            error_message: null,
            updated_at: now,
          })
          .eq("id", line.id);

        succeeded.push(line.id);
        succeededDetails.push({
          content_hash: line.content_hash,
          word_timestamps: wordTimestamps,
          duration_ms: durationMs,
          storage_path: storagePath,
          scene_sort_order: line.scene_sort_order,
          line_index: line.line_index,
          tts_voice_id: voiceId,
          character_name: charName,
          gender: profile.gender ?? "neutral",
        });
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        console.error(`[generate-audio] line ${line.id} failed:`, msg);
        errors.push(msg);
        await admin
          .from("scene_audio_lines")
          .update({
            generation_state: "error",
            error_message: msg,
            updated_at: now,
          })
          .eq("id", line.id);
        failed.push(line.id);
        failedLines.push({
          scene_sort_order: line.scene_sort_order,
          line_index: line.line_index,
          content_hash: line.content_hash,
        });
      }
    })
  );

  // Persist updated voice assignments
  if (analysisRow) {
    await supabase
      .from("play_ai_analysis")
      .update({ character_profiles: profiles, updated_at: now })
      .eq("play_id", playId);
  }

  // Generate signed URLs for succeeded lines so client can download immediately
  const succeededLines = await Promise.all(
    succeededDetails.map(async (d) => {
      const { data } = await admin.storage
        .from("play-audio")
        .createSignedUrl(d.storage_path, 3600);
      return {
        content_hash: d.content_hash,
        word_timestamps: d.word_timestamps,
        duration_ms: d.duration_ms,
        signed_url: data?.signedUrl ?? null,
        scene_sort_order: d.scene_sort_order,
        line_index: d.line_index,
        tts_voice_id: d.tts_voice_id,
        character_name: d.character_name,
        gender: d.gender,
      };
    })
  );

  let remainingQuery = admin
    .from("scene_audio_lines")
    .select("id", { count: "exact", head: true })
    .eq("play_id", playId)
    .eq("generation_state", "pending");
  if (sceneParam !== null) {
    remainingQuery = remainingQuery.eq("scene_sort_order", parseInt(sceneParam, 10));
  }
  const { count: remaining } = await remainingQuery;

  return NextResponse.json({
    processed: pendingLines.length,
    succeeded: succeeded.length,
    failed: failed.length,
    remaining: remaining ?? 0,
    firstError: errors[0] ?? null,
    succeededLines,
    failedLines,
  });
}

import { PollyClient, SynthesizeSpeechCommand, VoiceId } from "@aws-sdk/client-polly";

export interface WordTimestamp {
  word: string;
  time: number; // ms from audio start
}

// All IDs are taken directly from the SDK's VoiceId enum — TypeScript will
// catch any invalid value at compile time before it ever reaches AWS.
const VOICE_POOLS: Record<string, Record<string, VoiceId[]>> = {
  en: {
    male:    [VoiceId.Matthew, VoiceId.Gregory, VoiceId.Stephen, VoiceId.Joey, VoiceId.Justin, VoiceId.Kevin],
    female:  [VoiceId.Danielle, VoiceId.Ruth, VoiceId.Joanna, VoiceId.Salli, VoiceId.Kimberly, VoiceId.Kendra, VoiceId.Ivy, VoiceId.Amy],
    neutral: [VoiceId.Aria, VoiceId.Danielle, VoiceId.Joanna],
  },
  fr: {
    // Neural: Remi (M), Lea / Isabelle / Ambre (F)
    // Standard: Mathieu (M), Celine (F) — gives 2 male voices for multi-character plays
    male:    [VoiceId.Remi, VoiceId.Mathieu],
    female:  [VoiceId.Lea, VoiceId.Isabelle, VoiceId.Ambre, VoiceId.Celine],
    neutral: [VoiceId.Lea, VoiceId.Remi],
  },
};

// Voices that only support Engine="standard" (not neural)
const STANDARD_ONLY_VOICES = new Set<VoiceId>([
  VoiceId.Mathieu, VoiceId.Celine,
]);

function getVoicePool(language: string, gender: string): VoiceId[] {
  const lang = language.split("-")[0].toLowerCase();
  const pools = VOICE_POOLS[lang] ?? VOICE_POOLS["en"];
  const g = gender === "male" || gender === "female" ? gender : "neutral";
  return pools[g] ?? pools["neutral"] ?? pools["female"] ?? Object.values(pools)[0];
}

// Simple djb2-style hash so a character name maps to a stable pool offset.
// Two characters with different names will hit different starting points in the
// pool, reducing the chance that co-occurring characters share the same voice.
function nameHash(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = (h * 33) ^ name.charCodeAt(i);
  return Math.abs(h);
}

export function assignVoice(
  characterName: string,
  gender: string,
  language: string,
  usedVoices: Set<string>
): VoiceId {
  const pool = getVoicePool(language, gender);
  const available = pool.filter((v) => !usedVoices.has(v));
  const seed = nameHash(characterName);
  if (available.length > 0) return available[seed % available.length];
  // Pool exhausted — wrap around but still use name hash to differentiate
  return pool[seed % pool.length];
}

function makePollyClient(): PollyClient {
  return new PollyClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function sdkStreamToBuffer(stream: NodeJS.ReadableStream | Uint8Array | { transformToByteArray(): Promise<Uint8Array> }): Promise<Buffer> {
  if (stream instanceof Uint8Array) return Buffer.from(stream);
  if ("transformToByteArray" in stream) {
    return Buffer.from(await stream.transformToByteArray());
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function generateLineAudio(
  text: string,
  voiceId: VoiceId
): Promise<{ audioBuffer: Buffer; wordTimestamps: WordTimestamp[]; durationMs: number }> {
  const polly = makePollyClient();
  const engine = STANDARD_ONLY_VOICES.has(voiceId) ? "standard" : "neural";

  const [audioRes, marksRes] = await Promise.all([
    polly.send(
      new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: voiceId,
        OutputFormat: "mp3",
        Engine: engine,
      })
    ),
    polly.send(
      new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: voiceId,
        OutputFormat: "json",
        SpeechMarkTypes: ["word"],
        Engine: engine,
      })
    ),
  ]);

  if (!audioRes.AudioStream || !marksRes.AudioStream) throw new Error("Polly returned no audio stream");
  const audioBuffer = await sdkStreamToBuffer(audioRes.AudioStream);
  const marksBuffer = await sdkStreamToBuffer(marksRes.AudioStream);

  const wordTimestamps: WordTimestamp[] = marksBuffer
    .toString("utf-8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const m = JSON.parse(line);
        return m.type === "word" ? [{ word: m.value as string, time: m.time as number }] : [];
      } catch {
        return [];
      }
    });

  const lastMark = wordTimestamps[wordTimestamps.length - 1];
  const durationMs = lastMark ? lastMark.time + 600 : 0;

  return { audioBuffer, wordTimestamps, durationMs };
}

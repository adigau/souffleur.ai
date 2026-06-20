import { PollyClient, SynthesizeSpeechCommand, VoiceId } from "@aws-sdk/client-polly";
import { extractCleanSpeechText } from "@/lib/script-types";
export { extractCleanSpeechText };

export interface WordTimestamp {
  word: string;
  time: number; // ms from audio start
}

// All IDs are taken directly from the SDK's VoiceId enum — TypeScript will
// catch any invalid value at compile time before it ever reaches AWS.
const VOICE_POOLS: Record<string, Record<string, VoiceId[]>> = {
  en: {
    male:    [VoiceId.Justin, VoiceId.Joey, VoiceId.Kevin, VoiceId.Matthew, VoiceId.Stephen, VoiceId.Gregory],
    female:  [VoiceId.Ivy, VoiceId.Kimberly, VoiceId.Kendra, VoiceId.Joanna, VoiceId.Salli, VoiceId.Ruth, VoiceId.Danielle, VoiceId.Amy],
    neutral: [VoiceId.Aria, VoiceId.Ivy, VoiceId.Joanna],
  },
  fr: {
    male:    [VoiceId.Remi],
    female:  [VoiceId.Lea, VoiceId.Isabelle, VoiceId.Ambre],
    neutral: [VoiceId.Lea],
  },
  es: {
    male:    [VoiceId.Sergio, VoiceId.Pedro],
    female:  [VoiceId.Lucia, VoiceId.Lupe, VoiceId.Mia],
    neutral: [VoiceId.Lucia],
  },
  de: {
    male:    [VoiceId.Daniel, VoiceId.Florian],
    female:  [VoiceId.Vicki, VoiceId.Hannah],
    neutral: [VoiceId.Vicki],
  },
  it: {
    male:    [VoiceId.Adriano],
    female:  [VoiceId.Bianca],
    neutral: [VoiceId.Bianca],
  },
  pt: {
    male:    [VoiceId.Thiago],
    female:  [VoiceId.Camila, VoiceId.Vitoria, VoiceId.Ines],
    neutral: [VoiceId.Camila],
  },
  nl: {
    male:    [VoiceId.Ruben],
    female:  [VoiceId.Lotte],
    neutral: [VoiceId.Lotte],
  },
  ja: {
    male:    [VoiceId.Takumi, VoiceId.Kazuha],
    female:  [VoiceId.Mizuki, VoiceId.Tomoko],
    neutral: [VoiceId.Mizuki],
  },
  zh: {
    male:    [VoiceId.Zhiyu],
    female:  [VoiceId.Zhiyu],
    neutral: [VoiceId.Zhiyu],
  },
  ko: {
    male:    [VoiceId.Seoyeon],
    female:  [VoiceId.Seoyeon],
    neutral: [VoiceId.Seoyeon],
  },
  pl: {
    male:    [VoiceId.Jacek, VoiceId.Jan],
    female:  [VoiceId.Maja, VoiceId.Ola],
    neutral: [VoiceId.Ola],
  },
  sv: {
    male:    [VoiceId.Lennart],
    female:  [VoiceId.Elin],
    neutral: [VoiceId.Elin],
  },
};

// Voices that only support Engine="standard" (not neural)
const STANDARD_ONLY_VOICES = new Set<VoiceId>([
  VoiceId.Giorgio, VoiceId.Mathieu, VoiceId.Celine, VoiceId.Maxim,
  VoiceId.Tatyana, VoiceId.Karl, VoiceId.Naja,
]);

function getVoicePool(language: string, gender: string): VoiceId[] {
  const lang = language.split("-")[0].toLowerCase();
  const pools = VOICE_POOLS[lang] ?? VOICE_POOLS["en"];
  const g = gender === "male" || gender === "female" ? gender : "neutral";
  return pools[g] ?? pools["neutral"] ?? pools["female"] ?? Object.values(pools)[0];
}

export function assignVoice(
  _characterName: string,
  gender: string,
  language: string,
  usedVoices: Set<string>
): VoiceId {
  const pool = getVoicePool(language, gender);
  const available = pool.filter((v) => !usedVoices.has(v));
  if (available.length > 0) return available[0];
  return pool[usedVoices.size % pool.length];
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

async function sdkStreamToBuffer(stream: any): Promise<Buffer> {
  if (stream instanceof Uint8Array) return Buffer.from(stream);
  if (typeof stream.transformToByteArray === "function") {
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

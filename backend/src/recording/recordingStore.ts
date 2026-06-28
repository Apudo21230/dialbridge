import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

/** Persists a call recording to our own storage and returns the stored URL. */
export interface RecordingStore {
  store(callId: string, sourceUrl: string): Promise<string>;
}

export interface S3Config {
  region: string;
  bucket: string;
  folder: string;
}

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const TIMEOUT_MS = 30_000;
const ALLOWED_CONTENT_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];

/** Reject non-https, userinfo, odd ports, and hosts that resolve to private/loopback/metadata ranges (SSRF). */
async function assertSafeUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('invalid recording url');
  }
  if (url.protocol !== 'https:') throw new Error('recording url must be https');
  if (url.username || url.password) throw new Error('recording url must not contain userinfo');
  if (url.port && url.port !== '443') throw new Error('recording url port not allowed');
  const { address } = await lookup(url.hostname);
  if (ipaddr.parse(address).range() !== 'unicast') throw new Error('recording host is not allowed');
}

async function readCapped(res: Response, max: number): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error('recording too large');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export class S3RecordingStore implements RecordingStore {
  private readonly s3: S3Client;

  constructor(private readonly cfg: S3Config) {
    this.s3 = new S3Client({ region: cfg.region });
  }

  /** Download the provider recording (validated, size-capped) and re-store it under our bucket. */
  async store(callId: string, sourceUrl: string): Promise<string> {
    await assertSafeUrl(sourceUrl);

    // redirect: 'manual' defeats redirect-based SSRF; timeout bounds the request.
    const res = await fetch(sourceUrl, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`recording download failed: ${res.status}`);
    if (Number(res.headers.get('content-length') ?? '0') > MAX_BYTES) throw new Error('recording too large');

    const body = await readCapped(res, MAX_BYTES);
    const declaredType = res.headers.get('content-type')?.split(';')[0].trim() ?? '';
    const contentType = ALLOWED_CONTENT_TYPES.includes(declaredType) ? declaredType : 'audio/mpeg';

    const key = `${this.cfg.folder}recordings/${callId}.mp3`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: 'attachment',
      }),
    );
    return `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com/${key}`;
  }
}

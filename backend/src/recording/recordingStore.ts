import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/** Persists a call recording to our own storage and returns the stored URL. */
export interface RecordingStore {
  store(callId: string, sourceUrl: string): Promise<string>;
}

export interface S3Config {
  region: string;
  bucket: string;
  folder: string;
}

export class S3RecordingStore implements RecordingStore {
  private readonly s3: S3Client;

  constructor(private readonly cfg: S3Config) {
    this.s3 = new S3Client({ region: cfg.region });
  }

  /** Download the provider recording and re-store it under our bucket; return the stored URL. */
  async store(callId: string, sourceUrl: string): Promise<string> {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`recording download failed: ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'audio/mpeg';
    const key = `${this.cfg.folder}recordings/${callId}.mp3`;
    await this.s3.send(new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: body, ContentType: contentType }));
    return `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com/${key}`;
  }
}

import { describe, it, expect } from 'vitest';
import { S3RecordingStore } from '../../src/recording/recordingStore.js';

const store = new S3RecordingStore({ region: 'ap-south-1', bucket: 'b', folder: 'f/' });

describe('recording SSRF guard', () => {
  it('rejects non-https URLs', async () => {
    await expect(store.store('c1', 'http://example.com/r.mp3')).rejects.toThrow(/https/);
  });

  it('rejects URLs with userinfo', async () => {
    await expect(store.store('c1', 'https://user:pass@example.com/r.mp3')).rejects.toThrow(/userinfo/);
  });

  it('rejects hosts that resolve to loopback/private ranges', async () => {
    await expect(store.store('c1', 'https://127.0.0.1/r.mp3')).rejects.toThrow(/not allowed/);
  });

  it('rejects non-443 ports', async () => {
    await expect(store.store('c1', 'https://example.com:8080/r.mp3')).rejects.toThrow(/port/);
  });
});

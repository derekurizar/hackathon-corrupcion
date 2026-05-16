import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { AudioItem } from 'backend';

/**
 * Dev-loop S3 audio persistence (idea/07 Epic 7.4). `@aws-sdk/client-s3` is
 * allowed here — this is NOT `backend` (purity preserved). Skip-if-exists is
 * keyed by the shared `audioKey(caseKey,version,lang)` so a re-run over an
 * unchanged `{caseKey,version}` does zero PutObject calls. The Area 02 infra
 * glue Lambda mirrors this contract for the deployed Map:GenerateAudio task.
 */
export async function persistAudio(
  items: AudioItem[],
  bucket: string,
): Promise<{ uploaded: number; skipped: number }> {
  // For Lambda the region is resolved from the env; the CLI dev loop falls
  // back to AWS_REGION or us-east-1.
  const region = process.env['AWS_REGION'] ?? 'us-east-1';
  const s3 = new S3Client({ region });

  let uploaded = 0;
  let skipped = 0;

  for (const item of items) {
    let exists = false;
    try {
      await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: item.key }),
      );
      exists = true;
    } catch {
      // NotFound / any head error → treat as absent and upload.
      exists = false;
    }
    if (exists) {
      skipped += 1;
      continue;
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: item.key,
        Body: item.bytes,
        ContentType: item.contentType,
      }),
    );
    uploaded += 1;
  }

  return { uploaded, skipped };
}

/**
 * Cloudflare R2 storage connector.
 * R2 is S3-compatible — we use @aws-sdk/client-s3 with a custom endpoint.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getConfig } from '@arrivarangam/config'

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    const config = getConfig()
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return _client
}

/**
 * Upload a buffer to R2.
 * Returns the public URL if R2_PUBLIC_URL is configured, otherwise a signed URL.
 */
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType: string,
): Promise<string> {
  const config = getConfig()
  const client = getClient()

  await client.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  if (config.R2_PUBLIC_URL) {
    return `${config.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  }

  // Return a presigned URL valid for 7 days
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }),
    { expiresIn: 7 * 24 * 60 * 60 },
  )
  return url
}

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getConfig()
  const client = getClient()
  await client.send(
    new DeleteObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }),
  )
}

/**
 * Generate a presigned GET URL for a private object.
 */
export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const config = getConfig()
  const client = getClient()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

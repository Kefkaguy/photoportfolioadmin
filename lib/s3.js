import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const region = process.env.AWS_REGION
const bucketName = process.env.S3_BUCKET_NAME
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "")

let s3Client

function getClient() {
  if (!s3Client) {
    s3Client = new S3Client({ region })
  }

  return s3Client
}

function sanitizeFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function isS3Configured() {
  return Boolean(
    region &&
      bucketName &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  )
}

export function getPublicImageUrl(key) {
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

export async function createSignedUpload({ fileName, contentType, folder }) {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured")
  }

  const safeName = sanitizeFileName(fileName || "image")
  const key = `portfolio/${folder}/${Date.now()}-${safeName}`
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  })

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: 300,
  })

  return {
    key,
    uploadUrl,
    publicUrl: getPublicImageUrl(key),
  }
}

export async function deleteS3Object(key) {
  if (!key || !isS3Configured()) {
    return
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  )
}

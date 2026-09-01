import crypto from "node:crypto";

export function createCloudinaryUploadSignature(folder = "domora/hotels") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(`${paramsToSign}${apiSecret}`).digest("hex");
  return { cloudName, apiKey, timestamp, folder, signature };
}

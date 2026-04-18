import { deleteImage } from "@/lib/portfolio"
import { deleteS3Object } from "@/lib/s3"

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { id } = req.query

  try {
    const result = await deleteImage(id)
    await deleteS3Object(result.s3Key)
    return res.status(200).json({ deleted: true })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

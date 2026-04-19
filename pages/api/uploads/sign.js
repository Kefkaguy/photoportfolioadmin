import { ObjectId } from "mongodb"

import { getDb } from "@/lib/mongodb"
import { createSignedUpload, isS3Configured } from "@/lib/s3"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!isS3Configured()) {
    return res.status(400).json({ error: "S3 is not configured" })
  }

  try {
    const { categoryId, fileName, contentType, heroOnly } = req.body || {}
    const db = await getDb()
    let folder = "featured"

    if (!heroOnly) {
      if (!ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category id")
      }

      const category = await db.collection("categories").findOne({
        _id: new ObjectId(categoryId),
      })

      if (!category) {
        throw new Error("Category not found")
      }

      folder = category.folder || category.slug
    }

    const upload = await createSignedUpload({
      fileName,
      contentType,
      folder,
    })

    return res.status(200).json(upload)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

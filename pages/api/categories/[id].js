import { deleteCategory, updateCategory } from "@/lib/portfolio"
import { deleteS3Object } from "@/lib/s3"

export default async function handler(req, res) {
  const { id } = req.query

  try {
    if (req.method === "PUT") {
      const existingIconKey = typeof req.body?.existingIconS3Key === "string" ? req.body.existingIconS3Key : ""
      const category = await updateCategory(id, req.body || {})
      if (existingIconKey && existingIconKey !== category.iconS3Key) {
        await deleteS3Object(existingIconKey)
      }
      return res.status(200).json(category)
    }

    if (req.method === "DELETE") {
      const result = await deleteCategory(id)
      await Promise.all([...result.imageKeys, result.iconKey].filter(Boolean).map((key) => deleteS3Object(key)))
      return res.status(200).json({ deleted: true })
    }

    res.setHeader("Allow", "PUT, DELETE")
    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

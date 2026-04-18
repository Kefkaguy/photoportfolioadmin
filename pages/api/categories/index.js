import { createCategory } from "@/lib/portfolio"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const category = await createCategory(req.body || {})
    return res.status(201).json(category)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}

import { isMongoConfigured } from "@/lib/mongodb"
import { getPortfolioData } from "@/lib/portfolio"

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET")
      return res.status(405).json({ error: "Method not allowed" })
    }

    if (!isMongoConfigured()) {
      return res.status(400).json({
        error: "MongoDB is not configured for the admin app.",
      })
    }

    const portfolio = await getPortfolioData()
    return res.status(200).json(portfolio)
  } catch (error) {
    console.error("Failed to load admin portfolio", error)
    return res.status(500).json({
      error: error.message || "Failed to load portfolio",
    })
  }
}

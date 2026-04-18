import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || "photoportfolio"

let client

if (!globalThis._adminMongoClientPromise) {
  if (uri) {
    client = new MongoClient(uri)
    globalThis._adminMongoClientPromise = client.connect()
  } else {
    globalThis._adminMongoClientPromise = null
  }
}

export function isMongoConfigured() {
  return Boolean(uri)
}

export async function getDb() {
  if (!globalThis._adminMongoClientPromise) {
    throw new Error("MongoDB is not configured")
  }

  const resolvedClient = await globalThis._adminMongoClientPromise
  return resolvedClient.db(dbName)
}

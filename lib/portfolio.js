import { ObjectId } from "mongodb"

import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { slugify } from "@/lib/strings"

function normalizeAspectRatio(value) {
  return value ? String(value) : "4/5"
}

async function requireDb() {
  if (!isMongoConfigured()) {
    throw new Error("MongoDB is not configured")
  }

  return getDb()
}

function serializeCategory(category, imagesByCategoryId) {
  const categoryId = category._id.toString()
  return {
    id: categoryId,
    category: category.category,
    description: category.description || "",
    slug: category.slug,
    folder: category.folder || category.slug,
    order: category.order || 0,
    items: (imagesByCategoryId.get(categoryId) || []).map((image) => ({
      id: image._id.toString(),
      categoryId,
      title: image.title,
      alt: image.alt,
      description: image.description || "",
      src: image.src,
      s3Key: image.s3Key || "",
      aspectRatio: normalizeAspectRatio(image.aspectRatio),
      featured: Boolean(image.featured),
    })),
  }
}

function ensureObjectId(value, label) {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`)
  }

  return new ObjectId(value)
}

export async function getPortfolioData() {
  const db = await requireDb()
  const [categories, images] = await Promise.all([
    db.collection("categories").find({}).sort({ order: 1, createdAt: 1 }).toArray(),
    db.collection("images").find({}).sort({ createdAt: -1 }).toArray(),
  ])

  const imagesByCategoryId = new Map()
  for (const image of images) {
    const key = image.categoryId.toString()
    if (!imagesByCategoryId.has(key)) {
      imagesByCategoryId.set(key, [])
    }
    imagesByCategoryId.get(key).push(image)
  }

  return {
    images: categories.map((category) =>
      serializeCategory(category, imagesByCategoryId),
    ),
  }
}

export async function createCategory({ category, description = "" }) {
  const name = String(category || "").trim()
  const normalizedDescription = String(description || "").trim()
  if (!name) {
    throw new Error("Category name is required")
  }

  const db = await requireDb()
  const slug = slugify(name)
  const existing = await db.collection("categories").findOne({ slug })
  if (existing) {
    throw new Error("Category already exists")
  }

  const [lastCategory] = await db
    .collection("categories")
    .find({})
    .sort({ order: -1 })
    .limit(1)
    .toArray()

  const timestamp = new Date()
  const document = {
    category: name,
    description: normalizedDescription,
    slug,
    folder: slug,
    order: typeof lastCategory?.order === "number" ? lastCategory.order + 1 : 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const result = await db.collection("categories").insertOne(document)

  return {
    id: result.insertedId.toString(),
    category: name,
    description: normalizedDescription,
    slug,
    folder: slug,
    items: [],
  }
}

export async function updateCategory(id, { category, description = "" }) {
  const name = String(category || "").trim()
  const normalizedDescription = String(description || "").trim()
  if (!name) {
    throw new Error("Category name is required")
  }

  const db = await requireDb()
  const objectId = ensureObjectId(id, "category id")
  const existing = await db.collection("categories").findOne({
    slug: slugify(name),
    _id: { $ne: objectId },
  })

  if (existing) {
    throw new Error("Category already exists")
  }

  const current = await db.collection("categories").findOne({ _id: objectId })
  if (!current) {
    throw new Error("Category not found")
  }

  await db.collection("categories").updateOne(
    { _id: objectId },
    {
      $set: {
        category: name,
        description: normalizedDescription,
        slug: slugify(name),
        updatedAt: new Date(),
      },
    },
  )

  return {
    id,
    category: name,
    description: normalizedDescription,
    slug: slugify(name),
    folder: current.folder,
  }
}

export async function deleteCategory(id) {
  const db = await requireDb()
  const objectId = ensureObjectId(id, "category id")
  const images = await db
    .collection("images")
    .find({ categoryId: objectId })
    .project({ s3Key: 1 })
    .toArray()

  const categoryResult = await db.collection("categories").deleteOne({ _id: objectId })
  if (!categoryResult.deletedCount) {
    throw new Error("Category not found")
  }

  await db.collection("images").deleteMany({ categoryId: objectId })

  return {
    deleted: true,
    imageKeys: images.map((image) => image.s3Key).filter(Boolean),
  }
}

export async function addImage(input) {
  const db = await requireDb()
  const categoryId = ensureObjectId(input.categoryId, "category id")
  const category = await db.collection("categories").findOne({ _id: categoryId })

  if (!category) {
    throw new Error("Category not found")
  }

  const title = String(input.title || "").trim()
  const src = String(input.src || "").trim()
  if (!title || !src) {
    throw new Error("Title and image URL are required")
  }

  const timestamp = new Date()
  const document = {
    categoryId,
    title,
    alt: String(input.alt || title).trim(),
    description: String(input.description || "").trim(),
    src,
    s3Key: String(input.s3Key || "").trim(),
    aspectRatio: normalizeAspectRatio(input.aspectRatio),
    featured: Boolean(input.featured),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const result = await db.collection("images").insertOne(document)

  return {
    id: result.insertedId.toString(),
    ...document,
    categoryId: categoryId.toString(),
  }
}

export async function updateImage(id, input) {
  const db = await requireDb()
  const objectId = ensureObjectId(id, "image id")
  const existing = await db.collection("images").findOne({ _id: objectId })

  if (!existing) {
    throw new Error("Image not found")
  }

  const nextTitle = String(input.title ?? existing.title).trim()
  const nextSrc = String(input.src ?? existing.src).trim()
  if (!nextTitle || !nextSrc) {
    throw new Error("Title and image URL are required")
  }

  const updates = {
    title: nextTitle,
    alt: String(input.alt ?? existing.alt ?? nextTitle).trim(),
    description: String(input.description ?? existing.description ?? "").trim(),
    src: nextSrc,
    s3Key: String(input.s3Key ?? existing.s3Key ?? "").trim(),
    aspectRatio: normalizeAspectRatio(input.aspectRatio ?? existing.aspectRatio),
    featured:
      typeof input.featured === "boolean" ? input.featured : Boolean(existing.featured),
    updatedAt: new Date(),
  }

  await db.collection("images").updateOne(
    { _id: objectId },
    {
      $set: updates,
    },
  )

  return {
    id,
    categoryId: existing.categoryId.toString(),
    ...updates,
  }
}

export async function deleteImage(id) {
  const db = await requireDb()
  const objectId = ensureObjectId(id, "image id")
  const image = await db.collection("images").findOne({ _id: objectId })

  if (!image) {
    throw new Error("Image not found")
  }

  await db.collection("images").deleteOne({ _id: objectId })

  return {
    deleted: true,
    s3Key: image.s3Key || "",
  }
}

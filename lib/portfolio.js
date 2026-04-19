import { ObjectId } from "mongodb"

import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { slugify } from "@/lib/strings"

function normalizeAspectRatio(value) {
  return value ? String(value) : "4/5"
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag || "").trim().replace(/^#+/, "")).filter(Boolean))]
  }

  return [...new Set(
    String(value || "")
      .split(",")
      .map((tag) => tag.trim().replace(/^#+/, ""))
      .filter(Boolean),
  )]
}

function normalizeSubcategories(value) {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set()
  const normalized = []

  for (const item of value) {
    const name = String(item?.name || item?.category || "").trim()
    if (!name) {
      continue
    }

    const slug = slugify(item?.slug || name)
    if (!slug || seen.has(slug)) {
      continue
    }

    seen.add(slug)
    normalized.push({
      id: String(item?.id || new ObjectId()),
      name,
      slug,
    })
  }

  return normalized
}

async function requireDb() {
  if (!isMongoConfigured()) {
    throw new Error("MongoDB is not configured")
  }

  return getDb()
}

function serializeImage(image, categoryId = null) {
  return {
    id: image._id.toString(),
    categoryId,
    title: image.title,
    alt: image.alt,
    description: image.description || "",
    src: image.src,
    s3Key: image.s3Key || "",
    aspectRatio: normalizeAspectRatio(image.aspectRatio),
    featured: Boolean(image.featured),
    heroOnly: Boolean(image.heroOnly),
    subcategoryId: image.subcategoryId || "",
    tags: normalizeTags(image.tags),
  }
}

function serializeCategory(category, imagesByCategoryId) {
  const categoryId = category._id.toString()
  const subcategories = normalizeSubcategories(category.subcategories)
  return {
    id: categoryId,
    category: category.category,
    description: category.description || "",
    slug: category.slug,
    folder: category.folder || category.slug,
    order: category.order || 0,
    subcategories,
    items: (imagesByCategoryId.get(categoryId) || []).map((image) => serializeImage(image, categoryId)),
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

  const categoriesById = new Map(categories.map((category) => [category._id.toString(), category]))
  const imagesByCategoryId = new Map()
  const featuredImages = []

  for (const image of images) {
    const hasCategoryId = image.categoryId instanceof ObjectId
    const categoryId = hasCategoryId ? image.categoryId.toString() : null
    const category = categoryId ? categoriesById.get(categoryId) : null

    if (image.heroOnly) {
      if (image.featured) {
        featuredImages.push({
          ...serializeImage(image, null),
          categoryName: "",
          categorySlug: "",
          subcategoryName: "",
          subcategorySlug: "",
        })
      }
      continue
    }

    if (!categoryId || !category) {
      continue
    }

    if (!imagesByCategoryId.has(categoryId)) {
      imagesByCategoryId.set(categoryId, [])
    }
    imagesByCategoryId.get(categoryId).push(image)

    if (image.featured) {
      const subcategory =
        normalizeSubcategories(category.subcategories).find((item) => item.id === (image.subcategoryId || "")) ||
        null

      featuredImages.push({
        ...serializeImage(image, categoryId),
        categoryName: category.category,
        categorySlug: category.slug,
        subcategoryName: subcategory?.name || "",
        subcategorySlug: subcategory?.slug || "",
      })
    }
  }

  return {
    images: categories.map((category) => serializeCategory(category, imagesByCategoryId)),
    featuredImages,
  }
}

export async function createCategory({ category, description = "", subcategories = [] }) {
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
    subcategories: normalizeSubcategories(subcategories),
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
    subcategories: document.subcategories,
    items: [],
  }
}

export async function updateCategory(id, { category, description = "", subcategories = [] }) {
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
        subcategories: normalizeSubcategories(subcategories),
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
    subcategories: normalizeSubcategories(subcategories),
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
  const isHeroOnly = Boolean(input.heroOnly)

  let category = null
  let categoryId = null

  if (!isHeroOnly) {
    categoryId = ensureObjectId(input.categoryId, "category id")
    category = await db.collection("categories").findOne({ _id: categoryId })

    if (!category) {
      throw new Error("Category not found")
    }
  }

  const title = String(input.title || "").trim()
  const src = String(input.src || "").trim()
  if (!title || !src) {
    throw new Error("Title and image URL are required")
  }

  const subcategoryId = isHeroOnly ? "" : String(input.subcategoryId || "").trim()
  if (
    subcategoryId &&
    !normalizeSubcategories(category?.subcategories).some((item) => item.id === subcategoryId)
  ) {
    throw new Error("Selected subcategory does not exist")
  }

  const timestamp = new Date()
  const document = {
    ...(categoryId ? { categoryId } : {}),
    title,
    alt: String(input.alt || title).trim(),
    description: String(input.description || "").trim(),
    src,
    s3Key: String(input.s3Key || "").trim(),
    aspectRatio: normalizeAspectRatio(input.aspectRatio),
    featured: Boolean(input.featured),
    heroOnly: isHeroOnly,
    subcategoryId,
    tags: normalizeTags(input.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const result = await db.collection("images").insertOne(document)

  return {
    id: result.insertedId.toString(),
    ...document,
    categoryId: categoryId ? categoryId.toString() : null,
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

  const isHeroOnly = Boolean(existing.heroOnly)
  let nextSubcategoryId = ""

  if (!isHeroOnly) {
    const category = await db.collection("categories").findOne({ _id: existing.categoryId })
    if (!category) {
      throw new Error("Category not found")
    }

    nextSubcategoryId = String(input.subcategoryId ?? existing.subcategoryId ?? "").trim()
    if (
      nextSubcategoryId &&
      !normalizeSubcategories(category.subcategories).some((item) => item.id === nextSubcategoryId)
    ) {
      throw new Error("Selected subcategory does not exist")
    }
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
    heroOnly: isHeroOnly,
    subcategoryId: nextSubcategoryId,
    tags: normalizeTags(input.tags ?? existing.tags),
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
    categoryId: existing.categoryId ? existing.categoryId.toString() : null,
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

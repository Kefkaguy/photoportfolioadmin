import Head from "next/head"
import { useEffect, useState } from "react"
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiExternalLinkLine,
  RiLoader4Line,
  RiSave3Line,
  RiStarFill,
  RiStarLine,
  RiUploadCloud2Line,
} from "react-icons/ri"

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      isJson && payload?.error
        ? payload.error
        : typeof payload === "string" && payload.trim().startsWith("<")
          ? `Request failed with ${response.status}. Check the server logs.`
          : typeof payload === "string" && payload.trim()
            ? payload
            : `Request failed with ${response.status}.`

    throw new Error(message)
  }

  return payload
}

function defaultImageForm() {
  return {
    title: "",
    alt: "",
    description: "",
    aspectRatio: "4/5",
    featured: false,
    file: null,
  }
}

function defaultEditForm(image) {
  return {
    title: image.title || "",
    alt: image.alt || "",
    description: image.description || "",
    aspectRatio: image.aspectRatio || "4/5",
    featured: Boolean(image.featured),
  }
}

async function getImageAspectRatio(file) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const ratio = await new Promise((resolve, reject) => {
      const image = new window.Image()
      image.onload = () => resolve(`${image.width}/${image.height}`)
      image.onerror = reject
      image.src = objectUrl
    })

    return ratio
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function ConfirmModal({ action, busy, onCancel, onConfirm }) {
  if (!action) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_30px_120px_rgba(28,25,23,0.2)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Confirm action
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-900">
              {action.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-stone-200 p-2 text-stone-500 transition hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RiCloseLine size={16} />
          </button>
        </div>

        <p className="text-sm leading-7 text-stone-500">{action.message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {busy ? <RiLoader4Line className="animate-spin" size={16} /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ImageCard({
  image,
  form,
  busy,
  onChange,
  onSave,
  onToggleFeatured,
  onDelete,
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-stone-200 bg-stone-50">
      <div className="relative bg-stone-200" style={{ aspectRatio: image.aspectRatio || "4/5" }}>
        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onToggleFeatured(image)}
          disabled={busy}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white backdrop-blur transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {image.featured ? <RiStarFill size={14} /> : <RiStarLine size={14} />}
          {image.featured ? "Featured" : "Set featured"}
        </button>
      </div>

      <div className="space-y-3 p-4">
        <input
          type="text"
          value={form.title}
          onChange={(event) => onChange(image.id, "title", event.target.value)}
          placeholder="Image title"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />
        <input
          type="text"
          value={form.alt}
          onChange={(event) => onChange(image.id, "alt", event.target.value)}
          placeholder="Alt text"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />
        <textarea
          value={form.description}
          onChange={(event) => onChange(image.id, "description", event.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />
        <input
          type="text"
          value={form.aspectRatio}
          onChange={(event) => onChange(image.id, "aspectRatio", event.target.value)}
          placeholder="Aspect ratio"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />

        <div className="flex items-center justify-between gap-2">
          <a
            href={image.src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900"
          >
            Open
            <RiExternalLinkLine size={14} />
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSave(image.id)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <RiSave3Line size={15} />
              Save
            </button>
            <button
              type="button"
              onClick={() => onDelete(image.id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RiDeleteBin6Line size={15} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function CategoryEditor({
  category,
  imageForm,
  imageEditForms,
  onImageFormChange,
  onImageEditFormChange,
  onCategoryRename,
  onCategoryDelete,
  onImageCreate,
  onImageSave,
  onImageToggleFeatured,
  onImageDelete,
  busy,
}) {
  const [draftName, setDraftName] = useState(category.category)

  useEffect(() => {
    setDraftName(category.category)
  }, [category.category])

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
            Category
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {category.items.length} image{category.items.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="min-w-[220px] rounded-full border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-900"
            placeholder="Category name"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCategoryRename(category.id, draftName)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <RiSave3Line size={16} />
              Save
            </button>
            <button
              type="button"
              onClick={() => onCategoryDelete(category.id, category.category)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RiDeleteBin6Line size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          onSubmit={(event) => onImageCreate(event, category.id)}
          className="rounded-[24px] border border-stone-200 bg-stone-50 p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Add image</h3>
              <p className="text-sm text-stone-500">
                Upload to S3, store metadata in MongoDB.
              </p>
            </div>
            <RiUploadCloud2Line className="text-stone-400" size={22} />
          </div>

          <div className="space-y-3">
            <input
              required
              type="text"
              value={imageForm.title}
              onChange={(event) =>
                onImageFormChange(category.id, "title", event.target.value)
              }
              placeholder="Image title"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
            <input
              type="text"
              value={imageForm.alt}
              onChange={(event) =>
                onImageFormChange(category.id, "alt", event.target.value)
              }
              placeholder="Alt text"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
            <textarea
              value={imageForm.description}
              onChange={(event) =>
                onImageFormChange(category.id, "description", event.target.value)
              }
              placeholder="Description"
              rows={4}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
            <input
              type="text"
              value={imageForm.aspectRatio}
              onChange={(event) =>
                onImageFormChange(category.id, "aspectRatio", event.target.value)
              }
              placeholder="Aspect ratio (e.g. 4/5)"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
            <label className="flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={imageForm.featured}
                onChange={(event) =>
                  onImageFormChange(category.id, "featured", event.target.checked)
                }
              />
              Mark as featured
            </label>
            <label className="block rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-stone-500">
              <span className="mb-2 block font-medium text-stone-700">
                Choose file
              </span>
              <input
                required
                type="file"
                accept="image/*"
                onChange={(event) =>
                  onImageFormChange(category.id, "file", event.target.files?.[0] || null)
                }
                className="block w-full text-sm text-stone-500"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {busy ? <RiLoader4Line className="animate-spin" size={16} /> : <RiAddLine size={16} />}
              Upload image
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {category.items.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              form={imageEditForms[image.id] || defaultEditForm(image)}
              busy={busy}
              onChange={onImageEditFormChange}
              onSave={onImageSave}
              onToggleFeatured={onImageToggleFeatured}
              onDelete={onImageDelete}
            />
          ))}

          {category.items.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
              No images in this category yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default function AdminSite() {
  const [portfolio, setPortfolio] = useState({ images: [] })
  const [newCategory, setNewCategory] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState("")
  const [imageForms, setImageForms] = useState({})
  const [imageEditForms, setImageEditForms] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)

  const loadPortfolio = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/portfolio")
      const data = await parseApiResponse(response)

      setPortfolio(data)
      setImageForms((current) => {
        const next = { ...current }
        for (const category of data.images || []) {
          next[category.id] = next[category.id] || defaultImageForm()
        }
        return next
      })
      setImageEditForms(() => {
        const next = {}
        for (const category of data.images || []) {
          for (const image of category.items || []) {
            next[image.id] = defaultEditForm(image)
          }
        }
        return next
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPortfolio()
  }, [])

  const updateImageForm = (categoryId, field, value) => {
    setImageForms((current) => ({
      ...current,
      [categoryId]: {
        ...(current[categoryId] || defaultImageForm()),
        [field]: value,
      },
    }))
  }

  const updateImageEditForm = (imageId, field, value) => {
    setImageEditForms((current) => ({
      ...current,
      [imageId]: {
        ...(current[imageId] || defaultImageForm()),
        [field]: value,
      },
    }))
  }

  const withBusy = async (key, task) => {
    setBusyKey(key)
    setError("")
    setStatus("")

    try {
      await task()
    } catch (taskError) {
      setError(taskError.message)
    } finally {
      setBusyKey("")
    }
  }

  const createCategory = async (event) => {
    event.preventDefault()

    await withBusy("create-category", async () => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      })
      const data = await parseApiResponse(response)

      setNewCategory("")
      setStatus(`Created ${data.category}.`)
      await loadPortfolio()
    })
  }

  const renameCategory = async (categoryId, categoryName) => {
    await withBusy(`rename-${categoryId}`, async () => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryName }),
      })
      const data = await parseApiResponse(response)

      setStatus(`Updated ${data.category}.`)
      await loadPortfolio()
    })
  }

  const requestCategoryDelete = (categoryId, categoryName) => {
    setConfirmAction({
      key: `delete-category-${categoryId}`,
      title: `Delete ${categoryName}?`,
      message: "This will remove the category and all images inside it.",
      run: async () => {
        await withBusy(`delete-category-${categoryId}`, async () => {
          const response = await fetch(`/api/categories/${categoryId}`, {
            method: "DELETE",
          })
          await parseApiResponse(response)

          setStatus(`Deleted ${categoryName}.`)
          setConfirmAction(null)
          await loadPortfolio()
        })
      },
    })
  }

  const createImage = async (event, categoryId) => {
    event.preventDefault()

    await withBusy(`upload-${categoryId}`, async () => {
      const form = imageForms[categoryId] || defaultImageForm()
      if (!form.file) {
        throw new Error("Choose an image file first")
      }

      const aspectRatio =
        form.aspectRatio?.trim() || (await getImageAspectRatio(form.file))

      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          fileName: form.file.name,
          contentType: form.file.type,
        }),
      })
      const signData = await parseApiResponse(signResponse)

      const uploadResponse = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": form.file.type || "application/octet-stream",
        },
        body: form.file,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload to S3 failed")
      }

      const createResponse = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: form.title,
          alt: form.alt,
          description: form.description,
          aspectRatio,
          featured: form.featured,
          src: signData.publicUrl,
          s3Key: signData.key,
        }),
      })
      const createData = await parseApiResponse(createResponse)

      setImageForms((current) => ({
        ...current,
        [categoryId]: defaultImageForm(),
      }))
      setStatus(`Uploaded ${createData.title}.`)
      await loadPortfolio()
    })
  }

  const saveImage = async (imageId) => {
    await withBusy(`save-image-${imageId}`, async () => {
      const form = imageEditForms[imageId]
      const response = await fetch(`/api/images/${imageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const image = await parseApiResponse(response)

      setStatus(`Updated ${image.title}.`)
      await loadPortfolio()
    })
  }

  const toggleFeatured = async (image) => {
    const form = imageEditForms[image.id] || defaultEditForm(image)
    await withBusy(`feature-image-${image.id}`, async () => {
      const response = await fetch(`/api/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          featured: !image.featured,
        }),
      })
      const updated = await parseApiResponse(response)

      setStatus(updated.featured ? `Featured ${updated.title}.` : `Removed featured from ${updated.title}.`)
      await loadPortfolio()
    })
  }

  const requestImageDelete = (imageId) => {
    setConfirmAction({
      key: `delete-image-${imageId}`,
      title: "Delete this image?",
      message: "This will remove the image record and delete the S3 object.",
      run: async () => {
        await withBusy(`delete-image-${imageId}`, async () => {
          const response = await fetch(`/api/images/${imageId}`, {
            method: "DELETE",
          })
          await parseApiResponse(response)

          setStatus("Image deleted.")
          setConfirmAction(null)
          await loadPortfolio()
        })
      },
    })
  }

  const closeConfirmModal = () => {
    if (!busyKey.startsWith("delete-")) {
      setConfirmAction(null)
    }
  }

  return (
    <>
      <Head>
        <title>Photo Portfolio Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f4ee,white_45%,#f2efe9)] px-5 py-8 text-stone-900 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 rounded-[32px] border border-stone-200 bg-white/85 p-6 shadow-[0_30px_120px_rgba(28,25,23,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
              Separate admin app
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-5xl">
              Categories, uploads, cleanup.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500">
              This is a separate Next.js app intended for a different domain.
              It writes category data to MongoDB and uploads image files to S3.
            </p>
          </header>

          <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_24px_80px_rgba(28,25,23,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={createCategory} className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Add category"
                className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
              />
              <button
                type="submit"
                disabled={busyKey === "create-category"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {busyKey === "create-category" ? (
                  <RiLoader4Line className="animate-spin" size={16} />
                ) : (
                  <RiAddLine size={16} />
                )}
                Add category
              </button>
            </form>

            <button
              type="button"
              onClick={loadPortfolio}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              Refresh
            </button>
          </div>

          {status ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {status}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[28px] border border-stone-200 bg-white/80 text-stone-500 shadow-[0_24px_80px_rgba(28,25,23,0.06)]">
              <div className="inline-flex items-center gap-2">
                <RiLoader4Line className="animate-spin" size={18} />
                Loading portfolio
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {portfolio.images.map((category) => (
                <CategoryEditor
                  key={category.id}
                  category={category}
                  imageForm={imageForms[category.id] || defaultImageForm()}
                  imageEditForms={imageEditForms}
                  onImageFormChange={updateImageForm}
                  onImageEditFormChange={updateImageEditForm}
                  onCategoryRename={renameCategory}
                  onCategoryDelete={requestCategoryDelete}
                  onImageCreate={createImage}
                  onImageSave={saveImage}
                  onImageToggleFeatured={toggleFeatured}
                  onImageDelete={requestImageDelete}
                  busy={
                    busyKey.startsWith("upload-") ||
                    busyKey.includes(category.id) ||
                    category.items.some((image) => busyKey.includes(image.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        action={confirmAction}
        busy={confirmAction ? busyKey === confirmAction.key : false}
        onCancel={closeConfirmModal}
        onConfirm={() => confirmAction?.run()}
      />
    </>
  )
}

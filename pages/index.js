import Head from "next/head"
import { useEffect, useState } from "react"
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiExternalLinkLine,
  RiLoader4Line,
  RiPriceTag3Line,
  RiSave3Line,
  RiStarFill,
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
    file: null,
    subcategoryId: "",
    tags: "",
  }
}

function defaultFeaturedForm() {
  return defaultImageForm()
}

function defaultEditForm(image) {
  return {
    title: image.title || "",
    alt: image.alt || "",
    description: image.description || "",
    aspectRatio: image.aspectRatio || "4/5",
    subcategoryId: image.subcategoryId || "",
    tags: Array.isArray(image.tags) ? image.tags.map((tag) => `#${tag}`).join(", ") : "",
  }
}

function getSubcategoryImageCount(category, subcategoryId) {
  return (category.items || []).filter((image) => image.subcategoryId === subcategoryId).length
}

function getUploadTargetLabel(category, subcategory) {
  return category ? (subcategory ? `/${category.slug}/${subcategory.slug}` : `/${category.slug}`) : ""
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

function SubcategoryField({ item, onChange, onRemove, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={item.name}
        onChange={(event) => onChange(item.id, event.target.value)}
        placeholder="Subcategory name"
        className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-stone-900"
      />
      <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
        /{item.slug || "slug"}
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        className="rounded-full border border-red-200 p-2 text-red-600 transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RiDeleteBin6Line size={15} />
      </button>
    </div>
  )
}

function ImageCard({
  image,
  form,
  subcategories,
  busy,
  onChange,
  onSave,
  onDelete,
  badge,
  action,
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-stone-200 bg-stone-50">
      <div className="relative bg-stone-200" style={{ aspectRatio: image.aspectRatio || "4/5" }}>
        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
        {badge ? (
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white backdrop-blur">
            {badge}
          </div>
        ) : null}
        {action ? <div className="absolute right-3 top-3">{action}</div> : null}
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
        <select
          value={form.subcategoryId}
          onChange={(event) => onChange(image.id, "subcategoryId", event.target.value)}
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        >
          <option value="">No subcategory</option>
          {subcategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={form.tags}
          onChange={(event) => onChange(image.id, "tags", event.target.value)}
          placeholder="Tags, e.g. #Food, #Bread"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />
        <input
          type="text"
          value={form.aspectRatio}
          onChange={(event) => onChange(image.id, "aspectRatio", event.target.value)}
          placeholder="Aspect ratio"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
        />

        {Array.isArray(image.tags) && image.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {image.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

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
  onCategorySave,
  onCategoryDelete,
  onImageCreate,
  onImageSave,
  onImageDelete,
  busy,
}) {
  const [draftName, setDraftName] = useState(category.category)
  const [draftDescription, setDraftDescription] = useState(category.description || "")
  const [draftIconSrc, setDraftIconSrc] = useState(category.iconSrc || "")
  const [draftIconS3Key, setDraftIconS3Key] = useState(category.iconS3Key || "")
  const [draftIconFile, setDraftIconFile] = useState(null)
  const [draftSubcategories, setDraftSubcategories] = useState(category.subcategories || [])
  const [newSubcategory, setNewSubcategory] = useState("")
  const selectedSubcategory =
    category.subcategories.find((item) => item.id === imageForm.subcategoryId) || null
  const uploadTargetLabel = getUploadTargetLabel(category, selectedSubcategory)

  useEffect(() => {
    setDraftName(category.category)
    setDraftDescription(category.description || "")
    setDraftIconSrc(category.iconSrc || "")
    setDraftIconS3Key(category.iconS3Key || "")
    setDraftIconFile(null)
    setDraftSubcategories(category.subcategories || [])
  }, [category.category, category.description, category.iconSrc, category.iconS3Key, category.subcategories])

  const updateSubcategory = (subcategoryId, value) => {
    setDraftSubcategories((current) =>
      current.map((item) =>
        item.id === subcategoryId
          ? {
              ...item,
              name: value,
              slug: value
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, ""),
            }
          : item,
      ),
    )
  }

  const removeSubcategory = (subcategoryId) => {
    setDraftSubcategories((current) => current.filter((item) => item.id !== subcategoryId))
  }

  const addSubcategory = () => {
    const name = newSubcategory.trim()
    if (!name) {
      return
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    setDraftSubcategories((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        slug,
      },
    ])
    setNewSubcategory("")
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Category
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {category.items.length} image{category.items.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-stone-400">/{category.slug}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex min-w-[280px] flex-col gap-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-900"
                placeholder="Category name"
              />
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows={3}
                className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
                placeholder='Category description, e.g. "This thing is cool because..."'
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onCategorySave(category.id, {
                    categoryName: draftName,
                    categoryDescription: draftDescription,
                    subcategories: draftSubcategories,
                    iconSrc: draftIconSrc,
                    iconS3Key: draftIconS3Key,
                    iconFile: draftIconFile,
                    existingIconS3Key: category.iconS3Key || "",
                  })
                }
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

        <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
          <div className="mb-4 rounded-[22px] border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="h-24 w-24 overflow-hidden rounded-3xl border border-stone-200 bg-stone-100">
                {draftIconSrc ? (
                  <img src={draftIconSrc} alt={`${category.category} icon`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.18em] text-stone-400">
                    No icon
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-700">
                    Category card image
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    This image appears on the frontend card for {category.category}.
                  </p>
                </div>
                <label className="block rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  <span className="mb-2 block font-medium text-stone-700">Choose icon image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null
                      setDraftIconFile(file)
                      if (file) {
                        setDraftIconSrc(URL.createObjectURL(file))
                      }
                    }}
                    className="block w-full text-sm text-stone-500"
                  />
                </label>
                {draftIconSrc ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftIconSrc("")
                      setDraftIconS3Key("")
                      setDraftIconFile(null)
                    }}
                    disabled={busy}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove icon
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-700">
                Subcategories
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Add child sections inside {category.category}.
              </p>
            </div>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
              {draftSubcategories.length} total
            </span>
          </div>

          <div className="space-y-3">
            {draftSubcategories.map((item) => (
              <div key={item.id} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3">
                <SubcategoryField
                  item={item}
                  onChange={updateSubcategory}
                  onRemove={removeSubcategory}
                  disabled={busy}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-stone-400">
                    /{category.slug}/{item.slug} · {getSubcategoryImageCount(category, item.id)} image
                    {getSubcategoryImageCount(category, item.id) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubcategory}
                onChange={(event) => setNewSubcategory(event.target.value)}
                placeholder="Add subcategory, e.g. Raf'n'Roll"
                className="flex-1 rounded-full border border-dashed border-stone-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-stone-900"
              />
              <button
                type="button"
                onClick={addSubcategory}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RiAddLine size={15} />
                Add
              </button>
            </div>
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
                Upload regular gallery images for this category or one of its subcategories.
              </p>
            </div>
            <RiUploadCloud2Line className="text-stone-400" size={22} />
          </div>

          <div className="space-y-3">
            <div className="rounded-[22px] border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Upload destination
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Choose whether this image belongs to the main category page or one specific subcategory page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onImageFormChange(category.id, "subcategoryId", "")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    !imageForm.subcategoryId
                      ? "bg-stone-900 text-white"
                      : "border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                  }`}
                >
                  Main category
                </button>
                {category.subcategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onImageFormChange(category.id, "subcategoryId", item.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      imageForm.subcategoryId === item.id
                        ? "bg-stone-900 text-white"
                        : "border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                This image will be added to <span className="font-medium text-stone-900">{uploadTargetLabel}</span>
              </div>
            </div>
            <input
              required
              type="text"
              value={imageForm.title}
              onChange={(event) => onImageFormChange(category.id, "title", event.target.value)}
              placeholder="Image title"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
            <input
              type="text"
              value={imageForm.alt}
              onChange={(event) => onImageFormChange(category.id, "alt", event.target.value)}
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
              value={uploadTargetLabel}
              readOnly
              className="w-full rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-stone-600 outline-none"
            />
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                <RiPriceTag3Line size={14} />
                Tags
              </span>
              <input
                type="text"
                value={imageForm.tags}
                onChange={(event) => onImageFormChange(category.id, "tags", event.target.value)}
                placeholder="Tags, e.g. #Food, #Bread"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
            </label>
            <input
              type="text"
              value={imageForm.aspectRatio}
              onChange={(event) =>
                onImageFormChange(category.id, "aspectRatio", event.target.value)
              }
              placeholder="Aspect ratio (e.g. 4/5)"
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
            />
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
              subcategories={category.subcategories}
              busy={busy}
              onChange={onImageEditFormChange}
              onSave={onImageSave}
              onDelete={onImageDelete}
              badge={image.featured ? "Featured" : null}
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

function FeaturedEditor({
  featuredImages,
  featuredForm,
  imageEditForms,
  onFeaturedFormChange,
  onFeaturedImageCreate,
  onImageEditFormChange,
  onImageSave,
  onImageUnfeature,
  onImageDelete,
  busy,
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
        <div className="mb-6 flex flex-col gap-3 border-b border-stone-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Featured uploads
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-stone-900">
              Upload images directly into the featured rail.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-500">
              Images added here are used only in the homepage hero.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            <RiStarFill size={14} />
            {featuredImages.length} featured image{featuredImages.length === 1 ? "" : "s"}
          </span>
        </div>

        <form onSubmit={onFeaturedImageCreate} className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Add featured image</h3>
                <p className="text-sm text-stone-500">
                  Pick the destination first, then upload the image.
                </p>
              </div>
              <RiUploadCloud2Line className="text-stone-400" size={22} />
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                This featured image will appear only in the homepage hero.
              </div>

              <input
                required
                type="text"
                value={featuredForm.title}
                onChange={(event) => onFeaturedFormChange("title", event.target.value)}
                placeholder="Image title"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
              <input
                type="text"
                value={featuredForm.alt}
                onChange={(event) => onFeaturedFormChange("alt", event.target.value)}
                placeholder="Alt text"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
              <textarea
                value={featuredForm.description}
                onChange={(event) => onFeaturedFormChange("description", event.target.value)}
                placeholder="Description"
                rows={4}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  <RiPriceTag3Line size={14} />
                  Tags
                </span>
                <input
                  type="text"
                  value={featuredForm.tags}
                  onChange={(event) => onFeaturedFormChange("tags", event.target.value)}
                  placeholder="Tags, e.g. #Food, #Bread"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                />
              </label>
              <input
                type="text"
                value={featuredForm.aspectRatio}
                onChange={(event) => onFeaturedFormChange("aspectRatio", event.target.value)}
                placeholder="Aspect ratio (e.g. 4/5)"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
              />
              <label className="block rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-stone-500">
                <span className="mb-2 block font-medium text-stone-700">
                  Choose file
                </span>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={(event) => onFeaturedFormChange("file", event.target.files?.[0] || null)}
                  className="block w-full text-sm text-stone-500"
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {busy ? <RiLoader4Line className="animate-spin" size={16} /> : <RiStarFill size={16} />}
                Upload featured image
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                form={imageEditForms[image.id] || defaultEditForm(image)}
                subcategories={[]}
                busy={busy}
                onChange={onImageEditFormChange}
                onSave={onImageSave}
                onDelete={onImageDelete}
                badge={image.heroOnly ? "Hero only" : image.subcategorySlug ? `/${image.categorySlug}/${image.subcategorySlug}` : image.categorySlug ? `/${image.categorySlug}` : "Featured"}
                action={
                  <button
                    type="button"
                    onClick={() => onImageUnfeature(image)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white backdrop-blur transition hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RiStarFill size={14} />
                    {image.heroOnly ? "Remove from hero" : "Remove featured"}
                  </button>
                }
              />
            ))}

            {featuredImages.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 md:col-span-2 xl:col-span-3">
                No featured images yet.
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}

export default function AdminSite() {
  const [portfolio, setPortfolio] = useState({ images: [] })
  const [activeTab, setActiveTab] = useState("categories")
  const [newCategory, setNewCategory] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState("")
  const [imageForms, setImageForms] = useState({})
  const [featuredForm, setFeaturedForm] = useState(defaultFeaturedForm())
  const [imageEditForms, setImageEditForms] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)

  const categories = portfolio.images || []
  const featuredImages = portfolio.featuredImages || []

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
      setFeaturedForm((current) => ({
        ...defaultFeaturedForm(),
        ...current,
      }))
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

  const updateFeaturedForm = (field, value) => {
    setFeaturedForm((current) => ({
      ...current,
      [field]: value,
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

  const uploadImage = async ({ categoryId, form, reset, featured, heroOnly = false }) => {
    if (!form.file) {
      throw new Error("Choose an image file first")
    }

    const aspectRatio = form.aspectRatio?.trim() || (await getImageAspectRatio(form.file))

    const signResponse = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        heroOnly,
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
        ...(categoryId ? { categoryId } : {}),
        title: form.title,
        alt: form.alt,
        description: form.description,
        ...(heroOnly ? {} : { subcategoryId: form.subcategoryId }),
        tags: form.tags,
        aspectRatio,
        featured,
        heroOnly,
        src: signData.publicUrl,
        s3Key: signData.key,
      }),
    })
    const createData = await parseApiResponse(createResponse)

    reset()
    setStatus(`Uploaded ${createData.title}.`)
    await loadPortfolio()
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

  const saveCategory = async (
    categoryId,
    { categoryName, categoryDescription, subcategories, iconSrc, iconS3Key, iconFile, existingIconS3Key },
  ) => {
    await withBusy(`rename-${categoryId}`, async () => {
      let nextIconSrc = iconSrc || ""
      let nextIconS3Key = iconS3Key || ""

      if (iconFile) {
        const signResponse = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId,
            assetType: "category-icon",
            fileName: iconFile.name,
            contentType: iconFile.type,
          }),
        })
        const signData = await parseApiResponse(signResponse)

        const uploadResponse = await fetch(signData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": iconFile.type || "application/octet-stream",
          },
          body: iconFile,
        })

        if (!uploadResponse.ok) {
          throw new Error("Upload to S3 failed")
        }

        nextIconSrc = signData.publicUrl
        nextIconS3Key = signData.key
      }

      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryName,
          description: categoryDescription,
          subcategories,
          iconSrc: nextIconSrc,
          iconS3Key: nextIconS3Key,
          existingIconS3Key,
        }),
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
      message: "This will remove the category, its subcategories, and all images inside it.",
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

      await uploadImage({
        categoryId,
        form,
        featured: false,
        reset: () => {
          setImageForms((current) => ({
            ...current,
            [categoryId]: defaultImageForm(),
          }))
        },
      })
    })
  }

  const createFeaturedImage = async (event) => {
    event.preventDefault()

    await withBusy("upload-featured", async () => {
      await uploadImage({
        categoryId: null,
        form: featuredForm,
        featured: true,
        heroOnly: true,
        reset: () => {
          setFeaturedForm(defaultFeaturedForm())
        },
      })
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

  const removeFeatured = async (image) => {
    if (image.heroOnly) {
      await withBusy(`delete-image-${image.id}`, async () => {
        const response = await fetch(`/api/images/${image.id}`, {
          method: "DELETE",
        })
        await parseApiResponse(response)

        setStatus("Featured image removed.")
        await loadPortfolio()
      })
      return
    }

    const form = imageEditForms[image.id] || defaultEditForm(image)

    await withBusy(`feature-image-${image.id}`, async () => {
      const response = await fetch(`/api/images/${image.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          featured: false,
        }),
      })
      const updated = await parseApiResponse(response)

      setStatus(`Removed featured from ${updated.title}.`)
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

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === "categories"
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 bg-white/80 text-stone-700 hover:border-stone-900 hover:text-stone-900"
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("featured")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === "featured"
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 bg-white/80 text-stone-700 hover:border-stone-900 hover:text-stone-900"
              }`}
            >
              <RiStarFill size={14} />
              Featured
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
          ) : activeTab === "featured" ? (
            <FeaturedEditor
              featuredImages={featuredImages}
              featuredForm={featuredForm}
              imageEditForms={imageEditForms}
              onFeaturedFormChange={updateFeaturedForm}
              onFeaturedImageCreate={createFeaturedImage}
              onImageEditFormChange={updateImageEditForm}
              onImageSave={saveImage}
              onImageUnfeature={removeFeatured}
              onImageDelete={requestImageDelete}
              busy={
                busyKey === "upload-featured" ||
                busyKey.startsWith("feature-image-") ||
                busyKey.startsWith("save-image-") ||
                busyKey.startsWith("delete-image-")
              }
            />
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <CategoryEditor
                  key={category.id}
                  category={category}
                  imageForm={imageForms[category.id] || defaultImageForm()}
                  imageEditForms={imageEditForms}
                  onImageFormChange={updateImageForm}
                  onImageEditFormChange={updateImageEditForm}
                  onCategorySave={saveCategory}
                  onCategoryDelete={requestCategoryDelete}
                  onImageCreate={createImage}
                  onImageSave={saveImage}
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

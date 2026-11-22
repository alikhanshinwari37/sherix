function generateSlug(text) {
  if (typeof text !== "string") {
    throw new TypeError("Slug input must be a string.");
  }

  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = generateSlug;
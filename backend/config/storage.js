const supabase = require("./supabase");

const BUCKET_NAME = process.env.SUPABASE_BUCKET || "watch-products";

async function uploadProductImage(fileBuffer, filePath, mimeType) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicData.publicUrl
  };
}

async function deleteProductImage(filePath) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw new Error(`Image deletion failed: ${error.message}`);
  }

  return true;
}

module.exports = {
  uploadProductImage,
  deleteProductImage
};
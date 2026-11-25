require("dotenv").config();
const { pool } = require("../config/database");
const supabase = require("../config/supabase");

const BUCKET = process.env.SUPABASE_BUCKET || "watch-products";

function getPathFromUrl(url) {
  if (!url) return null;
  try {
    const parts = url.split("/storage/v1/object/public/");
    if (parts.length > 1) {
      return parts[1].split("/").slice(1).join("/");
    }
    return null;
  } catch { return null; }
}

async function run() {
  const isDelete = process.argv.includes("--delete");

  // 1. DB se saari valid images nikalo
  const result = await pool.query(`SELECT image_path, specifications FROM products`);
  const validPaths = new Set();
  result.rows.forEach(p => {
    if (p.image_path) validPaths.add(p.image_path);
    const extras = p.specifications?.extraImages || [];
    extras.forEach(url => {
      const path = getPathFromUrl(url);
      if (path) validPaths.add(path);
    });
  });
  console.log(`DB me valid images: ${validPaths.size}`);

  // 2. Supabase se saari files nikalo
  const { data: files, error } = await supabase.storage.from(BUCKET).list("products", { limit: 1000 });
  if (error) throw error;

  console.log(`Supabase me total files: ${files.length}`);

  const orphans = files.filter(f => !validPaths.has(`products/${f.name}`));

  console.log(`\nOrphan (bekaar) images: ${orphans.length}`);
  orphans.forEach(f => console.log(" - products/" + f.name));

  if (orphans.length === 0) {
    console.log("\nSab saaf hai! Kuch delete karne ki zaroorat nahi.");
    process.exit(0);
  }

  if (!isDelete) {
    console.log("\n>>> Ye sirf CHECK tha, kuch delete nahi hua.");
    console.log(">>> Delete karne ke liye ye chalao: node scripts/cleanup-images.js --delete");
    process.exit(0);
  }

  // 3. Delete karo
  const paths = orphans.map(f => `products/${f.name}`);
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);
  if (delErr) throw delErr;
  console.log(`\n✅ ${paths.length} bekaar images delete ho gayi!`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
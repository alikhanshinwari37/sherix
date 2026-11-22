const { pool } = require("../config/database");
const { uploadProductImage, deleteProductImage } = require("../config/storage");

function makeSlug(brand, model) {
  const base = `${brand}-${model}`.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${Date.now().toString().slice(-6)}`;
}

// Helper: publicUrl se Supabase path nikalne ke liye (extraImages ke liye)
function getPathFromUrl(url) {
  if (!url) return null;
  try {
    // URL jaisa: .../storage/v1/object/public/watch-products/products/123-abc.jpg
    const parts = url.split("/storage/v1/object/public/");
    if (parts.length > 1) {
      const afterBucket = parts[1].split("/").slice(1).join("/");
      return afterBucket;
    }
    return null;
  } catch (e) {
    return null;
  }
}

const createProduct = async (req, res) => {
  try {
    const {
      brand, model, description, price, stock,
      deliveryCharge, status,
      category, movement, strapMaterial, caseMaterial,
      dialColor, waterResistance, warranty, originalPrice, sku, name
    } = req.body;

    if (!brand || !model || !price || stock === undefined) {
      return res.status(400).json({ success: false, message: "Brand, Model, Price and Stock are required." });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least 1 image required." });
    }

    const firstFile = req.files[0];
    const filePath = `products/${Date.now()}-${firstFile.originalname}`;
    const { path, publicUrl } = await uploadProductImage(firstFile.buffer, filePath, firstFile.mimetype);

    let extraImages = [];
    for (let i = 1; i < req.files.length; i++) {
      const f = req.files[i];
      const p = `products/${Date.now()}-${i}-${f.originalname}`;
      const uploaded = await uploadProductImage(f.buffer, p, f.mimetype);
      extraImages.push(uploaded.publicUrl);
    }

    const specifications = {
      category: category || null,
      movement: movement || null,
      strapMaterial: strapMaterial || null,
      caseMaterial: caseMaterial || null,
      dialColor: dialColor || null,
      waterResistance: waterResistance || null,
      warranty: warranty || null,
      originalPrice: originalPrice || null,
      sku: sku || null,
      name: name || `${brand} ${model}`,
      extraImages: extraImages
    };

    const slug = makeSlug(brand, model);

    let finalStatus = "active";
    if (status === "hidden") finalStatus = "hidden";
    if (status === "archived") finalStatus = "archived";
    if (status === "draft") finalStatus = "hidden";

    const result = await pool.query(
      `INSERT INTO products 
       (brand, model, slug, description, price, stock_quantity, delivery_charge, image_url, image_path, specifications, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [brand, model, slug, description || "", price, stock, deliveryCharge || 0, publicUrl, path, JSON.stringify(specifications), finalStatus]
    );

    return res.status(201).json({ success: true, message: "Product created!", productId: result.rows[0].id });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to create product: " + error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, brand, model, slug, description, price, stock_quantity, delivery_charge, image_url, specifications, status, created_at
       FROM products ORDER BY created_at DESC`
    );
    return res.json({ success: true, products: result.rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to fetch." });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active","hidden","archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    await pool.query(`UPDATE products SET status=$1 WHERE id=$2`, [status, id]);
    return res.json({ success: true, message: "Status updated!" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// EDIT PRODUCT - FIXED: Purani image bhi delete hogi
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      brand, model, description, price, stock,
      deliveryCharge, status,
      category, movement, strapMaterial, caseMaterial,
      dialColor, waterResistance, warranty, originalPrice, sku, name
    } = req.body;

    const old = await pool.query(`SELECT * FROM products WHERE id=$1`, [id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const oldProduct = old.rows[0];
    const oldSpec = oldProduct.specifications || {};

    let image_url = oldProduct.image_url;
    let image_path = oldProduct.image_path;
    let extraImages = oldSpec.extraImages || [];

    if (req.files && req.files.length > 0) {
      // Pehle purani images delete karo
      try {
        if (oldProduct.image_path) await deleteProductImage(oldProduct.image_path);
        for (const url of extraImages) {
          const p = getPathFromUrl(url);
          if (p) await deleteProductImage(p);
        }
      } catch (delErr) {
        console.log("Old image delete warning:", delErr.message);
        // Purani image na delete ho to bhi update rokna nahi hai
      }

      const firstFile = req.files[0];
      const filePath = `products/${Date.now()}-${firstFile.originalname}`;
      const uploaded = await uploadProductImage(firstFile.buffer, filePath, firstFile.mimetype);
      image_url = uploaded.publicUrl;
      image_path = uploaded.path;
      extraImages = [];
      for (let i = 1; i < req.files.length; i++) {
        const f = req.files[i];
        const p = `products/${Date.now()}-${i}-${f.originalname}`;
        const up = await uploadProductImage(f.buffer, p, f.mimetype);
        extraImages.push(up.publicUrl);
      }
    }

    const specifications = {
      ...oldSpec,
      category: category ?? oldSpec.category,
      movement: movement ?? oldSpec.movement,
      strapMaterial: strapMaterial ?? oldSpec.strapMaterial,
      caseMaterial: caseMaterial ?? oldSpec.caseMaterial,
      dialColor: dialColor ?? oldSpec.dialColor,
      waterResistance: waterResistance ?? oldSpec.waterResistance,
      warranty: warranty ?? oldSpec.warranty,
      originalPrice: originalPrice ?? oldSpec.originalPrice,
      sku: sku ?? oldSpec.sku,
      name: name ?? oldSpec.name,
      extraImages: extraImages
    };

    let finalStatus = oldProduct.status;
    if (status) {
      if (status === "draft") finalStatus = "hidden";
      else if (["active","hidden","archived"].includes(status)) finalStatus = status;
    }

    await pool.query(
      `UPDATE products SET brand=$1, model=$2, description=$3, price=$4, stock_quantity=$5, delivery_charge=$6, image_url=$7, image_path=$8, specifications=$9, status=$10 WHERE id=$11`,
      [
        brand || oldProduct.brand,
        model || oldProduct.model,
        description ?? oldProduct.description,
        price ?? oldProduct.price,
        stock ?? oldProduct.stock_quantity,
        deliveryCharge ?? oldProduct.delivery_charge,
        image_url, image_path,
        JSON.stringify(specifications),
        finalStatus, id
      ]
    );

    return res.json({ success: true, message: "Product updated!" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE PRODUCT - FIXED: Supabase se image bhi delete hogi
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Pehle product nikalo taake image_path mile
    const found = await pool.query(`SELECT image_path, specifications FROM products WHERE id=$1`, [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = found.rows[0];
    const extraImages = product.specifications?.extraImages || [];

    // 2. Supabase se images delete karo
    try {
      if (product.image_path) {
        await deleteProductImage(product.image_path);
      }
      for (const url of extraImages) {
        const p = getPathFromUrl(url);
        if (p) await deleteProductImage(p);
      }
    } catch (delErr) {
      console.log("Image delete warning:", delErr.message);
      // Agar image pehle se delete ho to bhi product delete karna hai, is liye error throw nahi kar rahe
    }

    // 3. Ab DB se product delete karo
    await pool.query(`DELETE FROM products WHERE id=$1`, [id]);

    return res.json({ success: true, message: "Product + images deleted!" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { createProduct, getAllProducts, updateProductStatus, updateProduct, deleteProduct };
const express = require("express");
const router = express.Router();
const { 
  createProduct, 
  getAllProducts, 
  updateProductStatus,
  updateProduct,
  deleteProduct 
} = require("../controllers/productController");
const requireAuth = require("../middleware/auth");
const uploadModule = require("../middleware/upload");
const upload = uploadModule.upload || uploadModule.default || uploadModule;

router.post("/", requireAuth, upload.array("images", 5), createProduct);
router.get("/", getAllProducts);
router.patch("/:id/status", requireAuth, updateProductStatus);

// NEW - EDIT + DELETE
router.put("/:id", requireAuth, upload.array("images", 5), updateProduct);
router.delete("/:id", requireAuth, deleteProduct);

module.exports = router;
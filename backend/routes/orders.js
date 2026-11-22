const express = require("express");
const router = express.Router();
const { createOrder, getAllOrders, updateOrderStatus } = require("../controllers/orderController");

// Public - Shop se Order aayega
router.post("/", createOrder);

// Dashboard - Orders dekhne ke liye
// Note: Auth baad me lagayenge, pehle Orders test kar lo
router.get("/", getAllOrders);

// Dashboard - Status change: new / confirmed / done
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
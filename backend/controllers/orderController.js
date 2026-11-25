const { pool } = require("../config/database");

// Create Order - Jab customer WhatsApp dabaye
const createOrder = async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_email, customer_address, items, total_amount } = req.body;
    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ success: false, message: "Name, Phone, Address required" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart empty" });
    }
    const result = await pool.query(
      `INSERT INTO whatsapp_orders (customer_name, customer_phone, customer_email, customer_address, items, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,'new') RETURNING *`,
      [customer_name, customer_phone, customer_email || '', customer_address, JSON.stringify(items), total_amount || 0]
    );
    return res.status(201).json({ success: true, message: "Order saved!", order: result.rows[0] });
  } catch (e) {
    console.error("Create order error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Get All Orders - Dashboard ke liye
const getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM whatsapp_orders ORDER BY created_at DESC`);
    return res.json({ success: true, orders: result.rows });
  } catch (e) {
    console.error("Get orders error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Update Status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["new","confirmed","done","cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    await pool.query(`UPDATE whatsapp_orders SET status=$1 WHERE id=$2`, [status, id]);
    return res.json({ success: true, message: "Status updated!" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { createOrder, getAllOrders, updateOrderStatus };
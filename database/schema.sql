-- =====================================================
-- SHERIX V1 | DATABASE SCHEMA
-- PostgreSQL | Neon
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ADMIN / SELLER USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (delivery_charge >= 0),
    image_url TEXT,
    image_path TEXT,
    specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'hidden'
        CHECK (status IN ('active', 'hidden', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CUSTOMER ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(40) NOT NULL UNIQUE,
    customer_name VARCHAR(120) NOT NULL,
    mobile_number VARCHAR(25) NOT NULL,
    email VARCHAR(255),
    full_address TEXT NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    delivery_total NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (delivery_total >= 0),
    grand_total NUMERIC(12,2) NOT NULL CHECK (grand_total >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_delivery'
        CHECK (payment_method = 'cash_on_delivery'),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    order_status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (order_status IN (
            'pending', 'confirmed', 'processing',
            'shipped', 'delivered', 'cancelled'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    brand_snapshot VARCHAR(100) NOT NULL,
    model_snapshot VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (delivery_charge >= 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    note TEXT,
    changed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_products_status
ON products(status);

CREATE INDEX IF NOT EXISTS idx_products_brand
ON products(brand);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(order_status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id
ON order_status_history(order_id);
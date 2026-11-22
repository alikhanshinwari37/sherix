-- =====================================================
-- SHERIX V1 | PRODUCT IMAGE GALLERY
-- PostgreSQL | Neon
-- =====================================================

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    image_url TEXT NOT NULL,
    image_path TEXT NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product gallery lookup
CREATE INDEX IF NOT EXISTS idx_product_images_product_id
ON product_images(product_id);

-- Primary image lookup
CREATE INDEX IF NOT EXISTS idx_product_images_primary
ON product_images(product_id, is_primary);

-- Display order
CREATE INDEX IF NOT EXISTS idx_product_images_display_order
ON product_images(product_id, display_order);
const express = require('express');
const router = express.Router();

// Import middleware and services
const auth = require('../middleware/auth');
const security = require('../middleware/security');
const database = require('../config/database');

// Validation schemas
const schemas = security.setupInputValidation();

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status = 'active',
      search,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.status = $1';
    let queryParams = [status];
    let paramIndex = 2;

    // Add category filter
    if (category) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM product_categories pc 
        JOIN categories c ON pc.category_id = c.id 
        WHERE pc.product_id = p.id AND c.slug = $${paramIndex}
      )`;
      queryParams.push(category);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      whereClause += ` AND (
        p.name ILIKE $${paramIndex} OR 
        p.description ILIKE $${paramIndex} OR 
        p.sku ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add price range filter
    if (minPrice) {
      whereClause += ` AND p.price >= $${paramIndex}`;
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      whereClause += ` AND p.price <= $${paramIndex}`;
      queryParams.push(maxPrice);
      paramIndex++;
    }

    // Validate sort column
    const allowedSortColumns = ['name', 'price', 'created_at', 'updated_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get products
    const productsQuery = `
      SELECT 
        p.id, p.sku, p.name, p.description, p.short_description,
        p.price, p.compare_at_price, p.cost_price, p.weight, p.dimensions,
        p.inventory_count, p.track_inventory, p.allow_backorder,
        p.requires_shipping, p.is_taxable, p.status,
        p.seo_title, p.seo_description, p.created_at, p.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'altText', pi.alt_text,
              'sortOrder', pi.sort_order,
              'isPrimary', pi.is_primary
            ) ORDER BY pi.sort_order
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'
        ) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const productsResult = await database.query(productsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      ${whereClause}
    `;
    const countResult = await database.query(countQuery, queryParams.slice(0, -2));

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      products: productsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Failed to get products',
      code: 'PRODUCTS_ERROR'
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const productQuery = `
      SELECT 
        p.id, p.sku, p.name, p.description, p.short_description,
        p.price, p.compare_at_price, p.cost_price, p.weight, p.dimensions,
        p.inventory_count, p.track_inventory, p.allow_backorder,
        p.requires_shipping, p.is_taxable, p.status,
        p.seo_title, p.seo_description, p.created_at, p.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'altText', pi.alt_text,
              'sortOrder', pi.sort_order,
              'isPrimary', pi.is_primary
            ) ORDER BY pi.sort_order
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'
        ) as images,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', c.id,
              'name', c.name,
              'slug', c.slug
            ) ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as categories,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pv.id,
              'sku', pv.sku,
              'name', pv.name,
              'price', pv.price,
              'weight', pv.weight,
              'inventoryCount', pv.inventory_count,
              'imageUrl', pv.image_url,
              'position', pv.position
            ) ORDER BY pv.position
          ) FILTER (WHERE pv.id IS NOT NULL), 
          '[]'
        ) as variants
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.id = $1 AND p.status = 'active'
      GROUP BY p.id
    `;

    const result = await database.query(productQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Failed to get product',
      code: 'PRODUCT_ERROR'
    });
  }
});

// Create new product (admin only)
router.post('/',
  auth.authenticateAdmin,
  auth.requireRole(['admin', 'manager']),
  // security.validate(schemas.product),
  async (req, res) => {
    try {
      const productData = req.body;

      const result = await database.transaction(async (client) => {
        // Insert product
        const productQuery = `
          INSERT INTO products (
            sku, name, description, short_description, price, compare_at_price, cost_price,
            weight, dimensions, inventory_count, track_inventory, allow_backorder,
            requires_shipping, is_taxable, status, seo_title, seo_description
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          ) RETURNING *
        `;

        const values = [
          productData.sku,
          productData.name,
          productData.description,
          productData.shortDescription,
          productData.price,
          productData.compareAtPrice,
          productData.costPrice,
          productData.weight,
          JSON.stringify(productData.dimensions),
          productData.inventoryCount,
          productData.trackInventory,
          productData.allowBackorder,
          productData.requiresShipping,
          productData.isTaxable,
          productData.status,
          productData.seoTitle,
          productData.seoDescription
        ];

        const productResult = await client.query(productQuery, values);
        const product = productResult.rows[0];

        // Handle categories if provided
        if (productData.categoryIds && productData.categoryIds.length > 0) {
          const categoryValues = productData.categoryIds.map(categoryId => 
            `('${product.id}', '${categoryId}')`
          ).join(',');

          await client.query(`
            INSERT INTO product_categories (product_id, category_id) 
            VALUES ${categoryValues}
          `);
        }

        return product;
      });

      res.status(201).json({
        message: 'Product created successfully',
        product: result
      });

    } catch (error) {
      console.error('Create product error:', error);
      
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Product with this SKU already exists',
          code: 'SKU_EXISTS'
        });
      }

      res.status(500).json({
        error: 'Failed to create product',
        code: 'PRODUCT_CREATE_ERROR'
      });
    }
  }
);

// Update product (admin only)
router.put('/:id',
  auth.authenticateAdmin,
  auth.requireRole(['admin', 'manager']),
  // security.validate(schemas.product.partial(['sku'])),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if product exists
      const existingProduct = await database.query(
        'SELECT id FROM products WHERE id = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      const result = await database.transaction(async (client) => {
        // Update product
        const updateQuery = `
          UPDATE products SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            short_description = COALESCE($3, short_description),
            price = COALESCE($4, price),
            compare_at_price = COALESCE($5, compare_at_price),
            cost_price = COALESCE($6, cost_price),
            weight = COALESCE($7, weight),
            dimensions = COALESCE($8, dimensions),
            inventory_count = COALESCE($9, inventory_count),
            track_inventory = COALESCE($10, track_inventory),
            allow_backorder = COALESCE($11, allow_backorder),
            requires_shipping = COALESCE($12, requires_shipping),
            is_taxable = COALESCE($13, is_taxable),
            status = COALESCE($14, status),
            seo_title = COALESCE($15, seo_title),
            seo_description = COALESCE($16, seo_description),
            updated_at = NOW()
          WHERE id = $17
          RETURNING *
        `;

        const values = [
          updateData.name,
          updateData.description,
          updateData.shortDescription,
          updateData.price,
          updateData.compareAtPrice,
          updateData.costPrice,
          updateData.weight,
          JSON.stringify(updateData.dimensions),
          updateData.inventoryCount,
          updateData.trackInventory,
          updateData.allowBackorder,
          updateData.requiresShipping,
          updateData.isTaxable,
          updateData.status,
          updateData.seoTitle,
          updateData.seoDescription,
          id
        ];

        const productResult = await client.query(updateQuery, values);
        const product = productResult.rows[0];

        // Update categories if provided
        if (updateData.categoryIds !== undefined) {
          // Remove existing categories
          await client.query(
            'DELETE FROM product_categories WHERE product_id = $1',
            [id]
          );

          // Add new categories
          if (updateData.categoryIds.length > 0) {
            const categoryValues = updateData.categoryIds.map(categoryId => 
              `('${id}', '${categoryId}')`
            ).join(',');

            await client.query(`
              INSERT INTO product_categories (product_id, category_id) 
              VALUES ${categoryValues}
            `);
          }
        }

        return product;
      });

      res.json({
        message: 'Product updated successfully',
        product: result
      });

    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        error: 'Failed to update product',
        code: 'PRODUCT_UPDATE_ERROR'
      });
    }
  }
);

// Delete product (admin only)
router.delete('/:id',
  auth.authenticateAdmin,
  auth.requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await database.query(
        'SELECT id FROM products WHERE id = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      // Soft delete by setting status to archived
      await database.query(
        'UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2',
        ['archived', id]
      );

      res.json({
        message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        error: 'Failed to delete product',
        code: 'PRODUCT_DELETE_ERROR'
      });
    }
  }
);

// Get product categories
router.get('/categories/list', async (req, res) => {
  try {
    const { includeEmpty = false } = req.query;

    let query = `
      SELECT 
        c.id, c.name, c.slug, c.description, c.parent_id, c.sort_order, c.is_visible,
        c.seo_title, c.seo_description, c.created_at,
        COUNT(pc.product_id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN products p ON pc.product_id = p.id AND p.status = 'active'
    `;

    if (includeEmpty === 'false') {
      query += ' WHERE c.is_visible = true';
    }

    query += `
      GROUP BY c.id, c.name, c.slug, c.description, c.parent_id, c.sort_order, c.is_visible, c.seo_title, c.seo_description, c.created_at
      ORDER BY c.sort_order, c.name
    `;

    const result = await database.query(query);

    res.json({
      categories: result.rows
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      code: 'CATEGORIES_ERROR'
    });
  }
});

// Search products
router.get('/search/query', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const searchQuery = `
      SELECT 
        p.id, p.name, p.short_description, p.price,
        p.seo_title, p.seo_description,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'isPrimary', pi.is_primary
            ) ORDER BY pi.sort_order
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'
        ) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status = 'active' AND (
        p.name ILIKE $1 OR 
        p.description ILIKE $1 OR 
        p.short_description ILIKE $1 OR 
        p.sku ILIKE $1
      )
      GROUP BY p.id
      ORDER BY 
        CASE WHEN p.name ILIKE $1 THEN 1 ELSE 2 END,
        p.name
      LIMIT $2
    `;

    const result = await database.query(searchQuery, [`%${query}%`, limit]);

    res.json({
      query,
      products: result.rows
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      error: 'Failed to search products',
      code: 'SEARCH_ERROR'
    });
  }
});

module.exports = router;

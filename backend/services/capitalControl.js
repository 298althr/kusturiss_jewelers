const database = require('../config/database');

class CapitalControlService {
  constructor() {
    this.defaultSettings = {
      maxCapitalPerSKU: 10000, // $10,000 max capital per SKU
      minMarginThreshold: 20, // 20% minimum margin
      maxDiscountPercentage: 30, // 30% max discount
      lowStockThreshold: 10, // 10 units low stock
      deadStockDays: 90, // 90 days for dead stock
      inventoryTurnoverTarget: 6 // 6 turns per year
    };
  }

  // Calculate SKU-level profitability
  async calculateSKUProfitability(productId, startDate, endDate) {
    try {
      const [productData, salesData, costData] = await Promise.all([
        // Product information
        database.query(`
          SELECT id, name, sku, price, cost_price, inventory_count, status
          FROM products WHERE id = $1
        `, [productId]),
        
        // Sales data
        database.query(`
          SELECT 
            oi.quantity,
            oi.price,
            oi.product_id,
            o.total_amount,
            o.created_at,
            o.status
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.product_id = $1 
            AND o.status != 'cancelled'
            AND ($2::date IS NULL OR o.created_at >= $2::date)
            AND ($3::date IS NULL OR o.created_at <= $3::date)
        `, [productId, startDate, endDate]),
        
        // Cost breakdown
        database.query(`
          SELECT 
            SUM(CASE WHEN cost_type = 'shipping' THEN amount ELSE 0 END) as shipping_cost,
            SUM(CASE WHEN cost_type = 'payment' THEN amount ELSE 0 END) as payment_cost,
            SUM(CASE WHEN cost_type = 'marketing' THEN amount ELSE 0 END) as marketing_cost,
            SUM(CASE WHEN cost_type = 'storage' THEN amount ELSE 0 END) as storage_cost
          FROM product_costs
          WHERE product_id = $1
            AND ($2::date IS NULL OR date >= $2::date)
            AND ($3::date IS NULL OR date <= $3::date)
        `, [productId, startDate, endDate])
      ]);

      const product = productData.rows[0];
      const sales = salesData.rows;
      const costs = costData.rows[0];

      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate metrics
      const totalQuantitySold = sales.reduce((sum, sale) => sum + parseInt(sale.quantity), 0);
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.quantity * sale.price), 0);
      const totalCOGS = totalQuantitySold * parseFloat(product.cost_price || 0);
      const totalShippingCost = parseFloat(costs.shipping_cost || 0);
      const totalPaymentCost = parseFloat(costs.payment_cost || 0);
      const totalMarketingCost = parseFloat(costs.marketing_cost || 0);
      const totalStorageCost = parseFloat(costs.storage_cost || 0);

      const totalCosts = totalCOGS + totalShippingCost + totalPaymentCost + totalMarketingCost + totalStorageCost;
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = totalRevenue - totalCosts;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Capital allocation
      const capitalAllocated = totalQuantitySold * parseFloat(product.cost_price || 0) + 
                              (product.inventory_count * parseFloat(product.cost_price || 0));
      const capitalTurnover = capitalAllocated > 0 ? totalRevenue / capitalAllocated : 0;

      // Risk assessment
      const riskFactors = [];
      let riskScore = 0;

      if (netMargin < this.defaultSettings.minMarginThreshold) {
        riskFactors.push('LOW_MARGIN');
        riskScore += 30;
      }

      if (product.inventory_count > this.defaultSettings.deadStockDays) {
        riskFactors.push('HIGH_INVENTORY');
        riskScore += 20;
      }

      if (capitalTurnover < 2) {
        riskFactors.push('LOW_TURNOVER');
        riskScore += 25;
      }

      const riskLevel = this.getRiskLevel(riskScore);

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        period: { startDate, endDate },
        sales: {
          quantitySold: totalQuantitySold,
          revenue: totalRevenue,
          averageOrderValue: totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0
        },
        costs: {
          cogs: totalCOGS,
          shipping: totalShippingCost,
          payment: totalPaymentCost,
          marketing: totalMarketingCost,
          storage: totalStorageCost,
          total: totalCosts
        },
        profitability: {
          grossProfit,
          netProfit,
          grossMargin,
          netMargin,
          contributionMargin: grossMargin
        },
        capital: {
          allocated: capitalAllocated,
          turnover: capitalTurnover,
          daysOfInventory: this.calculateDaysOfInventory(product.inventory_count, totalQuantitySold, startDate, endDate),
          capitalEfficiency: netProfit / capitalAllocated
        },
        risk: {
          score: riskScore,
          level: riskLevel,
          factors: riskFactors
        },
        inventory: {
          currentStock: product.inventory_count,
          stockStatus: this.getStockStatus(product.inventory_count),
          reorderPoint: Math.max(10, Math.ceil(totalQuantitySold / 30)) // 30 days supply
        }
      };

    } catch (error) {
      console.error('SKU profitability calculation error:', error);
      throw error;
    }
  }

  // Calculate days of inventory
  calculateDaysOfInventory(currentStock, quantitySold, startDate, endDate) {
    if (quantitySold === 0) return 999; // Infinite days
    const daysInPeriod = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const dailySales = quantitySold / daysInPeriod;
    return Math.ceil(currentStock / dailySales);
  }

  // Get stock status
  getStockStatus(inventoryCount) {
    if (inventoryCount === 0) return 'OUT_OF_STOCK';
    if (inventoryCount <= 5) return 'CRITICAL';
    if (inventoryCount <= 10) return 'LOW';
    if (inventoryCount <= 50) return 'ADEQUATE';
    return 'HIGH';
  }

  // Get risk level
  getRiskLevel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  // Get portfolio overview
  async getPortfolioOverview(startDate, endDate) {
    try {
      const [portfolioMetrics, topPerformers, poorPerformers, capitalAllocation] = await Promise.all([
        // Overall portfolio metrics
        database.query(`
          SELECT 
            COUNT(DISTINCT p.id) as total_skus,
            COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_skus,
            SUM(p.inventory_count * COALESCE(p.cost_price, 0)) as total_capital_allocated,
            SUM(CASE WHEN p.inventory_count = 0 THEN 1 END) as out_of_stock_skus,
            SUM(CASE WHEN p.inventory_count <= 10 THEN 1 END) as low_stock_skus
          FROM products p
        `),
        
        // Top performing SKUs
        database.query(`
          SELECT 
            p.id, p.name, p.sku,
            SUM(oi.quantity * oi.price) as revenue,
            SUM(oi.quantity * oi.price) - SUM(oi.quantity * COALESCE(p.cost_price, 0)) as profit,
            SUM(oi.quantity) as quantity_sold
          FROM products p
          JOIN order_items oi ON p.id = oi.product_id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status != 'cancelled'
            AND ($1::date IS NULL OR o.created_at >= $1::date)
            AND ($2::date IS NULL OR o.created_at <= $2::date)
          GROUP BY p.id, p.name, p.sku
          ORDER BY profit DESC
          LIMIT 10
        `, [startDate, endDate]),
        
        // Poor performing SKUs
        database.query(`
          SELECT 
            p.id, p.name, p.sku,
            p.inventory_count,
            COALESCE(SUM(oi.quantity), 0) as quantity_sold,
            COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
          FROM products p
          LEFT JOIN order_items oi ON p.id = oi.product_id
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            AND ($1::date IS NULL OR o.created_at >= $1::date)
            AND ($2::date IS NULL OR o.created_at <= $2::date)
          GROUP BY p.id, p.name, p.sku, p.inventory_count
          ORDER BY quantity_sold ASC, revenue ASC
          LIMIT 10
        `, [startDate, endDate]),
        
        // Capital allocation by category
        database.query(`
          SELECT 
            p.category,
            COUNT(DISTINCT p.id) as sku_count,
            SUM(p.inventory_count * COALESCE(p.cost_price, 0)) as capital_allocated,
            COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
          FROM products p
          LEFT JOIN order_items oi ON p.id = oi.product_id
          LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
            AND ($1::date IS NULL OR o.created_at >= $1::date)
            AND ($2::date IS NULL OR o.created_at <= $2::date)
          GROUP BY p.category
          ORDER BY capital_allocated DESC
        `, [startDate, endDate])
      ]);

      const portfolio = portfolioMetrics.rows[0];
      const totalCapital = parseFloat(portfolio.total_capital_allocated || 0);

      return {
        overview: {
          totalSKUs: parseInt(portfolio.total_skus),
          activeSKUs: parseInt(portfolio.active_skus),
          totalCapitalAllocated: totalCapital,
          outOfStockSKUs: parseInt(portfolio.out_of_stock_skus),
          lowStockSKUs: parseInt(portfolio.low_stock_skus),
          stockHealth: {
            healthy: parseInt(portfolio.active_skus) - parseInt(portfolio.out_of_stock_skus) - parseInt(portfolio.low_stock_skus),
            warning: parseInt(portfolio.low_stock_skus),
            critical: parseInt(portfolio.out_of_stock_skus)
          }
        },
        topPerformers: topPerformers.rows,
        poorPerformers: poorPerformers.rows,
        capitalAllocation: capitalAllocation.rows.map(item => ({
          category: item.category,
          skuCount: parseInt(item.sku_count),
          capitalAllocated: parseFloat(item.capital_allocated),
          revenue: parseFloat(item.revenue),
          capitalEfficiency: parseFloat(item.capital_allocated) > 0 ? 
            parseFloat(item.revenue) / parseFloat(item.capital_allocated) : 0
        }))
      };

    } catch (error) {
      console.error('Portfolio overview error:', error);
      throw error;
    }
  }

  // Get margin breach alerts
  async getMarginBreachAlerts() {
    try {
      const result = await database.query(`
        SELECT 
          p.id, p.name, p.sku, p.price, p.cost_price,
          CASE 
            WHEN p.cost_price IS NULL OR p.cost_price = 0 THEN NULL
            ELSE ROUND(((p.price - p.cost_price) / p.price) * 100, 2)
          END as current_margin,
          p.inventory_count
        FROM products p
        WHERE p.status = 'active'
          AND p.cost_price IS NOT NULL 
          AND p.cost_price > 0
          AND ((p.price - p.cost_price) / p.price) * 100 < $1
        ORDER BY current_margin ASC
      `, [this.defaultSettings.minMarginThreshold]);

      return result.rows.map(product => ({
        ...product,
        breachSeverity: product.current_margin < 10 ? 'CRITICAL' : 
                       product.current_margin < 15 ? 'HIGH' : 'MEDIUM',
        recommendation: this.getMarginRecommendation(product.current_margin, product.inventory_count)
      }));

    } catch (error) {
      console.error('Margin breach alerts error:', error);
      throw error;
    }
  }

  // Get margin recommendation
  getMarginRecommendation(currentMargin, inventoryCount) {
    if (currentMargin < 10) {
      return inventoryCount > 50 ? 'LIQUIDATE_INVENTORY' : 'INCREASE_PRICE';
    } else if (currentMargin < 15) {
      return 'REVIEW_COSTS_AND_PRICING';
    } else {
      return 'MONITOR_CLOSELY';
    }
  }

  // Create capital control alert
  async createCapitalAlert(productId, alertType, details, severity = 'MEDIUM') {
    await database.query(`
      INSERT INTO capital_alerts (
        product_id, alert_type, details, severity, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [productId, alertType, JSON.stringify(details), severity]);
  }

  // Get dead stock analysis
  async getDeadStockAnalysis(daysThreshold = 90) {
    try {
      const result = await database.query(`
        SELECT 
          p.id, p.name, p.sku, p.price, p.cost_price,
          p.inventory_count,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
          MAX(o.created_at) as last_sale_date,
          p.inventory_count * COALESCE(p.cost_price, 0) as capital_tied_up
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
        WHERE p.inventory_count > 0
          AND (o.created_at IS NULL OR o.created_at < NOW() - INTERVAL '${daysThreshold} days')
        GROUP BY p.id, p.name, p.sku, p.price, p.cost_price, p.inventory_count
        ORDER BY capital_tied_up DESC
      `);

      return result.rows.map(product => ({
        ...product,
        daysSinceLastSale: product.last_sale_date ? 
          Math.ceil((new Date() - new Date(product.last_sale_date)) / (1000 * 60 * 60 * 24)) : 999,
        liquidationValue: product.inventory_count * parseFloat(product.price || 0) * 0.5, // 50% of price
        recommendation: this.getDeadStockRecommendation(product.inventory_count, product.capital_tied_up)
      }));

    } catch (error) {
      console.error('Dead stock analysis error:', error);
      throw error;
    }
  }

  // Get dead stock recommendation
  getDeadStockRecommendation(inventoryCount, capitalTiedUp) {
    if (capitalTiedUp > 5000) {
      return 'URGENT_LIQUIDATION';
    } else if (inventoryCount > 100) {
      return 'BUNDLE_DEAL';
    } else {
      return 'DISCOUNT_CLEARANCE';
    }
  }
}

module.exports = new CapitalControlService();

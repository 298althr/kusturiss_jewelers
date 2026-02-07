const database = require('../config/database');

class FraudDetectionService {
  constructor() {
    this.riskFactors = {
      highValueOrder: 1000, // Orders over $1000
      newCustomerRisk: 50,
      suspiciousAddress: 100,
      rapidOrders: 80,
      paymentMethodRisk: {
        'credit_card': 20,
        'paypal': 10,
        'crypto': 200
      }
    };
  }

  // Calculate fraud score for an order
  async calculateFraudScore(order, customer, ipAddress, userAgent) {
    try {
      let riskScore = 0;
      const riskFactors = [];

      // High-value order risk
      if (order.total_amount > this.riskFactors.highValueOrder) {
        riskScore += 30;
        riskFactors.push('HIGH_VALUE_ORDER');
      }

      // New customer risk
      const customerAge = this.getCustomerAge(customer.created_at);
      if (customerAge < 7) { // Less than 7 days
        riskScore += this.riskFactors.newCustomerRisk;
        riskFactors.push('NEW_CUSTOMER');
      }

      // Rapid orders check
      const recentOrders = await this.getRecentOrders(customer.id, 24); // Last 24 hours
      if (recentOrders.length >= 3) {
        riskScore += this.riskFactors.rapidOrders;
        riskFactors.push('RAPID_ORDERS');
      }

      // Address verification
      const addressRisk = await this.verifyAddress(order.shipping_address);
      if (addressRisk.isSuspicious) {
        riskScore += this.riskFactors.suspiciousAddress;
        riskFactors.push('SUSPICIOUS_ADDRESS');
      }

      // Payment method risk
      const paymentRisk = this.riskFactors.paymentMethodRisk[order.payment_method] || 50;
      riskScore += paymentRisk;
      riskFactors.push(`PAYMENT_METHOD_${order.payment_method.toUpperCase()}`);

      // Geographic risk assessment
      const geoRisk = await this.assessGeographicRisk(ipAddress, order.shipping_address);
      riskScore += geoRisk.score;
      riskFactors.push(...geoRisk.factors);

      // Device fingerprinting risk
      const deviceRisk = await this.analyzeDevice(userAgent, ipAddress);
      riskScore += deviceRisk.score;
      riskFactors.push(...deviceRisk.factors);

      const fraudLevel = this.getFraudLevel(riskScore);

      return {
        score: riskScore,
        level: fraudLevel,
        factors: riskFactors,
        requiresManualReview: fraudLevel === 'HIGH' || fraudLevel === 'CRITICAL',
        recommendations: this.getRecommendations(fraudLevel, riskFactors)
      };

    } catch (error) {
      console.error('Fraud detection error:', error);
      return {
        score: 100,
        level: 'HIGH',
        factors: ['DETECTION_ERROR'],
        requiresManualReview: true,
        recommendations: ['MANUAL_REVIEW_REQUIRED']
      };
    }
  }

  // Get customer age in days
  getCustomerAge(createdAt) {
    return Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  }

  // Get recent orders for customer
  async getRecentOrders(customerId, hours) {
    const result = await database.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE customer_id = $1 
        AND created_at >= NOW() - INTERVAL '${hours} hours'
    `, [customerId]);
    
    return parseInt(result.rows[0].count);
  }

  // Verify shipping address
  async verifyAddress(address) {
    const suspiciousPatterns = [
      /\b(suite|apt|room)\s*\d+\b/i.test(address.address_line_1),
      !address.city || address.city.length < 2,
      !address.postal_code || address.postal_code.length < 3,
      address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postal_code)
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern);

    return {
      isSuspicious,
      score: isSuspicious ? 50 : 0
    };
  }

  // Geographic risk assessment
  async assessGeographicRisk(ipAddress, shippingAddress) {
    // Simplified geo-risk logic
    const highRiskCountries = ['XX', 'YY']; // Add actual high-risk countries
    const riskFactors = [];
    let score = 0;

    if (highRiskCountries.includes(shippingAddress.country)) {
      score += 40;
      riskFactors.push('HIGH_RISK_COUNTRY');
    }

    // Check if IP country matches shipping country
    // This would require IP geolocation service integration
    riskFactors.push('GEO_VERIFICATION_NEEDED');

    return { score, factors: riskFactors };
  }

  // Device fingerprinting analysis
  async analyzeDevice(userAgent, ipAddress) {
    const riskFactors = [];
    let score = 0;

    // Check for suspicious user agents
    const suspiciousUAPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i
    ];

    if (suspiciousUAPatterns.some(pattern => pattern.test(userAgent))) {
      score += 100;
      riskFactors.push('SUSPICIOUS_USER_AGENT');
    }

    // Check for VPN/proxy (simplified)
    if (this.isLikelyVPN(ipAddress)) {
      score += 30;
      riskFactors.push('VPN_OR_PROXY');
    }

    return { score, factors: riskFactors };
  }

  // Simple VPN detection (would use actual IP intelligence service)
  isLikelyVPN(ipAddress) {
    // Simplified logic - in production, use MaxMind, IPQualityScore, etc.
    return false;
  }

  // Determine fraud level based on score
  getFraudLevel(score) {
    if (score >= 150) return 'CRITICAL';
    if (score >= 100) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  // Get recommendations based on fraud level and factors
  getRecommendations(level, factors) {
    const recommendations = [];

    switch (level) {
      case 'CRITICAL':
        recommendations.push('BLOCK_ORDER');
        recommendations.push('MANUAL_REVIEW_REQUIRED');
        recommendations.push('FLAG_CUSTOMER');
        break;
      case 'HIGH':
        recommendations.push('MANUAL_REVIEW');
        recommendations.push('ADDITIONAL_VERIFICATION');
        if (factors.includes('HIGH_VALUE_ORDER')) {
          recommendations.push('REQUIRE_ID_VERIFICATION');
        }
        break;
      case 'MEDIUM':
        recommendations.push('ENHANCED_MONITORING');
        if (factors.includes('NEW_CUSTOMER')) {
          recommendations.push('EMAIL_VERIFICATION');
        }
        break;
      case 'LOW':
        recommendations.push('STANDARD_PROCESSING');
        break;
      default:
        recommendations.push('AUTO_APPROVE');
    }

    return recommendations;
  }

  // Log fraud detection results
  async logFraudDetection(orderId, fraudResult) {
    await database.query(`
      INSERT INTO fraud_detection_logs (
        order_id, fraud_score, fraud_level, risk_factors, 
        requires_manual_review, recommendations, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      orderId,
      fraudResult.score,
      fraudResult.level,
      JSON.stringify(fraudResult.factors),
      fraudResult.requiresManualReview,
      JSON.stringify(fraudResult.recommendations)
    ]);
  }

  // Update order with fraud status
  async updateOrderFraudStatus(orderId, fraudResult) {
    await database.query(`
      UPDATE orders 
      SET fraud_score = $1, fraud_level = $2, 
          requires_manual_review = $3, updated_at = NOW()
      WHERE id = $4
    `, [
      fraudResult.score,
      fraudResult.level,
      fraudResult.requiresManualReview,
      orderId
    ]);
  }
}

module.exports = new FraudDetectionService();

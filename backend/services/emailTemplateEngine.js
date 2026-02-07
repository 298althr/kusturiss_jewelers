const Handlebars = require('handlebars');
const moment = require('moment');

class EmailTemplateEngine {
  constructor() {
    this.registerHelpers();
  }

  render(templateName, data) {
    return database.query(
      'SELECT html_content, text_content FROM email_templates WHERE name = $1 AND is_active = true',
      [templateName]
    ).then(result => {
      if (result.rows.length === 0) {
        throw new Error(`Template ${templateName} not found`);
      }
      
      const template = result.rows[0];
      const compiledHtml = Handlebars.compile(template.html_content);
      const compiledText = template.text_content ? Handlebars.compile(template.text_content) : null;
      
      return {
        html: compiledHtml(data),
        text: compiledText ? compiledText(data) : null
      };
    });
  }

  registerHelpers() {
    Handlebars.registerHelper('currency', (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    });

    Handlebars.registerHelper('date', (date, format) => {
      return moment(date).format(format || 'MMMM DD, YYYY');
    });

    Handlebars.registerHelper('productUrl', (productId) => {
      return `${process.env.FRONTEND_URL}/products/${productId}`;
    });

    Handlebars.registerHelper('cartUrl', () => {
      return `${process.env.FRONTEND_URL}/cart`;
    });
  }
}

module.exports = new EmailTemplateEngine();

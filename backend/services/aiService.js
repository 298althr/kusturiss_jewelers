/**
 * AI Service - Simulates AI-powered content generation for the luxury jewelry business.
 * In a real-world scenario, this would integrate with OpenAI (GPT-4) or Stability AI.
 */

class AIService {
    constructor() {
        this.descriptionTemplates = [
            "A masterpiece of {material}, the {productName} speaks to an era of {adjective} elegance. Featuring {detail}, this piece is hand-crafted to capture the light and the {emotion} of the wearer.",
            "Elevate your collection with the {productName}. This {adjective} creation combines {material} with {detail}, resulting in a {emotion} statement that transcends time.",
            "Designed for the {adjective} individual, the {productName} is a testament to Kusturiss heritage. The fluid lines of {material} meet {detail}, creating a sense of {emotion} and prestige."
        ];

        this.adjectives = ["unrivaled", "timeless", "breath-taking", "minimalist", "opulent", "sophisticated"];
        this.emotions = ["soul", "passion", "legacy", "grace", "grandeur", "spirit"];
        this.details = [
            "delicate hand-carved filigree",
            "a precision-cut GIA diamond",
            "micro-pavé settings that shimmer with every movement",
            "an architectural silhouette inspired by classic heritage",
            "ethically sourced rare gemstones"
        ];
    }

    async generateDescription(productName, material) {
        // Simulate AI latency
        await new Promise(resolve => setTimeout(resolve, 1500));

        const template = this.descriptionTemplates[Math.floor(Math.random() * this.descriptionTemplates.length)];
        const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const emotion = this.emotions[Math.floor(Math.random() * this.emotions.length)];
        const detail = this.details[Math.floor(Math.random() * this.details.length)];

        return template
            .replace('{productName}', productName)
            .replace('{material}', material)
            .replace('{adjective}', adjective)
            .replace('{emotion}', emotion)
            .replace('{detail}', detail);
    }

    async generateImagePrompt(productName, material) {
        return `High-end professional studio photography of ${productName} made of ${material}. Soft diffused lighting, macro lens focus on textures, deep shadows, luxurious velvet background. 8k resolution, cinematic fire and sparkle.`;
    }
}

module.exports = new AIService();

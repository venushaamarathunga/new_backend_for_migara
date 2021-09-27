import { models } from 'mongoose';
import PromotionCampaign from './PromotionCampaign';

function createPromotion(promotion: PromotionCampaign) {
    let expiresAt = new Date(`${promotion.expiresAt} 23:59:59`).toISOString();

    return new models.PromotionCampaign({
        title: promotion.title,
        briefDescription: promotion.briefDescription,
        detailedDescription: promotion.detailedDescription,
        thumbnailImageUrl: promotion.thumbnailImageUrl,
        largeImageUrl: promotion.largeImageUrl,
        expiresAt
    }).save();
}

export const promotionService = { createPromotion };

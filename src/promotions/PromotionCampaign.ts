import { IPromotionCampaign } from './../models/promotion-campaign';

export default class PromotionCampaign {
    public id: String;
    public title: String;
    public thumbnailImageUrl: String;
    public largeImageUrl: String;
    public briefDescription: String;
    public detailedDescription: String;
    public expiresAt: String;

    constructor(promotion: IPromotionCampaign) {
        this.id = promotion._id;
        this.title = promotion.title;
        this.thumbnailImageUrl = promotion.thumbnailImageUrl;
        this.largeImageUrl = promotion.largeImageUrl;
        this.briefDescription = promotion.briefDescription;
        this.detailedDescription = promotion.detailedDescription;
        this.expiresAt = promotion.expiresAt.toISOString().split('T')[0];
    }
}

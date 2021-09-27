import { DateTime } from 'luxon';
import { IPromotionCampaign } from '../models/promotion-campaign';
import { StorageHelper } from '../utils/storage/storage.service';

export default class PromotionCampaignView {
    public id: string;
    public type: string;
    public title: string;
    public thumbnailImageUrl: string;
    public imageUrls: string[];
    public description: string;
    public expiresAt: string;
    public scheduledDate: string;
    public targetAllFlavaCustomers: boolean;
    public executed: boolean;
    public pricingModel: {
        type: 'discount' | 'price_off' | 'price_only';
        value: number;
        currentPrice: number;
    };
    public webUrl: string;
    public tags: string[];
    public reached: number;
    public totalClicked: number;
    public uniqueClicked: number;

    constructor(
        promotion: IPromotionCampaign,
        reaches?: number,
        totalClicks?: number,
        uniqueClicks?: number
    ) {
        const storage = StorageHelper.getInstance();
        this.id = promotion.id;
        this.type = promotion.type;
        this.title = promotion.title;
        this.description = promotion.description;
        this.thumbnailImageUrl = storage.getPublicUrlForResource(
            promotion.storageBucket,
            promotion.thumbnailImageUrl
        );
        this.imageUrls = [];
        for (let i = 0, len = promotion.imageUrls.length; i < len; i++) {
            this.imageUrls.push(
                storage.getPublicUrlForResource(promotion.storageBucket, promotion.imageUrls[i])
            );
        }
        this.expiresAt = promotion.expiresAt.toISOString().split('T')[0];
        this.scheduledDate = promotion.scheduledDate.toISOString();
        this.targetAllFlavaCustomers = promotion.targetAllFlavaCustomers;
        this.executed = promotion.executed;
        this.pricingModel = promotion.pricingModel;
        this.webUrl = promotion.webUrl;
        this.tags = [];
        if (DateTime.fromJSDate(promotion.scheduledDate).plus({ days: 15 }) >= DateTime.utc()) {
            this.tags.push('NEW');
        }
        if (promotion.pricingModel && promotion.pricingModel.type === 'discount') {
            this.tags.push('%');
        }

        this.reached = reaches;
        this.totalClicked = totalClicks;
        this.uniqueClicked = uniqueClicks;
    }
}

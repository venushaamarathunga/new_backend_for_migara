export default class UserPromotion {
    public type: string;
    public vendorName: string;
    public id: string;
    public title: string;
    public description: string;
    public thumbnailImageUrl: string;
    public imageUrls: string[];
    public expiresAt = Date;
    public scheduledDate = Date;
    public targetAllFlavaCustomers: boolean;
    public executed: boolean;
    public pricingModel: { type: string; value: number; currentPrice: number };
    public webUrl: string;
    public tags: string[];

    constructor(id: string) {
        this.id = id;
    }
}

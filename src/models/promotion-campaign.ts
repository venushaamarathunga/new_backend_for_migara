import { Document, Schema, model } from 'mongoose';

export interface IPromotionCampaign extends Document {
    title: string;
    thumbnailImageUrl: string;
    largeImageUrl: string;
    briefDescription: string;
    detailedDescription: string;
    expiresAt: Date;
}

const schema: Schema = new Schema({
    title: { type: String, required: true, maxlength: 30 },
    briefDescription: { type: String, required: true, maxlength: 50 },
    detailedDescription: { type: String, required: true, maxlength: 150 },
    thumbnailImageUrl: { type: String },
    largeImageUrl: { type: String },
    expiresAt: { type: Date, required: true }
});

const dataModel = model<IPromotionCampaign>('PromotionCampaign', schema, 'promotions-campaigns');
export default dataModel;

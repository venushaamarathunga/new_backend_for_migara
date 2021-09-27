import { Document, model, Schema, Types } from 'mongoose';

export interface IVendorRedeemable extends Document {
    vendorId: Types.ObjectId;
    targetPoints: number;
    title: string;
    description?: string;
    thumbnailImageUrl?: string;
    imageUrls?: string[];
    expiryDate?: Date;
}

const schema: Schema = new Schema(
    {
        vendorId: { type: Schema.Types.ObjectId, required: true },
        targetPoints: { type: Number, required: true },
        title: { type: String, required: true },
        description: String,
        thumbnailImageUrl: String,
        imageUrls: Array,
        expiryDate: Date,
    },
    { timestamps: true }
);

// tslint:disable-next-line: variable-name
export const VendorRedeemable = model<IVendorRedeemable>(
    'VendorRedeemable',
    schema,
    'vendor-redeemables'
);

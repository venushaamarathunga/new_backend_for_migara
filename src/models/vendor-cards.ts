import { Document, model, Schema, Types } from 'mongoose';

export interface IVendorCard extends Document {
    vendorId: Types.ObjectId;
    uuid: string;
    used: boolean;
}

const schema: Schema = new Schema(
    {
        vendorId: { type: Types.ObjectId, required: true },
        uuid: { type: String, required: true },
        used: { type: Boolean, default: false },
    },
    {
        timestamps: {
            createdAt: true,
        },
    }
);

schema.index({ uuid: 1 }, { unique: true });

// tslint:disable-next-line: variable-name
export const VendorCard = model<IVendorCard>('VendorCard', schema, 'vendor-cards');

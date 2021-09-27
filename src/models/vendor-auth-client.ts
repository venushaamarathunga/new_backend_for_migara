import { Document, model, Model, Schema, Types } from 'mongoose';
import { IVendor } from './vendor';

export interface IVendorAuthClient extends Document {
    clientId: string;
    vendorId: Types.ObjectId;
    deviceId: string;
    cardUuid: string;
    branch: string;
}

const schema: Schema = new Schema(
    {
        clientId: { type: String, required: true },
        vendorId: { type: Schema.Types.ObjectId, required: true },
        deviceId: { type: String, required: true },
        cardUuid: { type: String, required: true },
        branch: String,
    },
    { timestamps: true }
);

schema.statics.findVendorByClientId = function(clientId: string) {
    return this.aggregate([
        {
            $match: { clientId },
        },
        {
            $lookup: {
                from: 'vendors',
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendor',
            },
        },
        {
            $unwind: { path: '$vendor' },
        },
        {
            $limit: 1,
        },
    ]).then((results: any) => {
        if (!results || results.length === 0) {
            return null;
        }

        return results[0].vendor;
    });
};

schema.index({ clientId: 1 }, { unique: true });
schema.index({ cardUuid: 1 }, { unique: true });

export type VendorAuthClientSchema = Model<IVendorAuthClient> & {
    findVendorByClientId: (clientId: string) => Promise<IVendor>;
};

// tslint:disable-next-line: variable-name
export const VendorAuthClient = model<IVendorAuthClient, VendorAuthClientSchema>(
    'VendorAuthClient',
    schema,
    'vendor-auth-clients'
);

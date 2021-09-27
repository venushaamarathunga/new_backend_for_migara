import { Document, model, Model, Schema, Types } from 'mongoose';

export interface IVendorManager extends Document {
    userId: Types.ObjectId;
    vendorId: Types.ObjectId;
}

const schema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true },
        vendorId: { type: Schema.Types.ObjectId, required: true },
    },
    { timestamps: true }
);

schema.statics.findVendorManagerByUUID = (uuid: string) => {
    return model('User')
        .aggregate([
            {
                $match: { uuid },
            },
            {
                $lookup: {
                    from: 'vendor-managers',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'vendorManager',
                },
            },
            {
                $unwind: { path: '$vendorManager' },
            },
            {
                $limit: 1,
            },
        ])
        .then(results => {
            if (results == null || results.length === 0) {
                return null;
            }
            return results[0].vendorManager;
        });
};

export type VendorManagerSchema = Model<IVendorManager> & {
    findVendorManagerByUUID: (uuid: string) => Promise<IVendorManager>;
};

// tslint:disable-next-line: variable-name
export const VendorManager = model<IVendorManager, VendorManagerSchema>(
    'VendorManager',
    schema,
    'vendor-managers'
);

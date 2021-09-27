import { Document, model, Model, Schema, Types } from 'mongoose';
import { IVendor } from './vendor';

export interface IVendorPointsScheme extends Document {
    id?: Types.ObjectId;
    vendorId: Types.ObjectId;
    type: 'PERCENTAGE_OF_BILL_VAL' | 'FIXED';
    default: boolean;
    percentageOfBillValue?: number;
    fixed?: number;
    checkinIntervelInSeconds: number; // default 2 minutes
    criteria?: object; // todo: maybe we can include direct user filtering queries?
    getPointsToBeAdded: () => number;
}

const schema: Schema = new Schema(
    {
        id: Schema.Types.ObjectId,
        vendorId: { type: Schema.Types.ObjectId, required: true },
        type: { type: String, enum: ['PERCENTAGE_OF_BILL_VAL', 'FIXED'], required: true },
        default: Boolean,
        percentageOfBillValue: Number,
        fixed: Number,
        checkinIntervelInSeconds: { type: Number, default: 120 }, // default 2 minutes
    },
    { timestamps: true }
);

schema.statics.findMatchingPointsScheme = function(vendor: IVendor) {
    return this.findOne({ vendorId: vendor._id, default: true });
};

schema.methods.getPointsToBeAdded = function() {
    if (this.type === 'FIXED') {
        return this.fixed || 0;
    } else if (this.type === 'PERCENTAGE_OF_BILL_VAL') {
        return 0;
    }
    return 0;
};

export type VendorPointsSchemeSchema = Model<IVendorPointsScheme> & {
    findMatchingPointsScheme: (vendor: IVendor) => Promise<IVendorPointsScheme>;
};

const dataModel = model<IVendorPointsScheme, VendorPointsSchemeSchema>(
    'VendorPointsScheme',
    schema,
    'vendor-points-schemes'
);
export default dataModel;

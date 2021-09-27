import { Document, model, Schema, Types } from 'mongoose';

export interface IVendorCustomer extends Document {
    id?: Types.ObjectId;
    userId: Types.ObjectId;
    vendorId: Types.ObjectId;
    points: number;
    totalPointsEarned: number;
    totalPointsBurned: number;
    pointsSchemeId?: Types.ObjectId;
    getPointsToBeAdded: () => number;
}

const schema: Schema = new Schema(
    {
        id: Schema.Types.ObjectId,
        userId: { type: Schema.Types.ObjectId, required: true },
        vendorId: { type: Schema.Types.ObjectId, required: true },
        pointsSchemeId: Schema.Types.ObjectId,
        points: { type: Schema.Types.Number, default: 0 },
        totalPointsEarned: { type: Schema.Types.Number, default: 0 },
        totalPointsBurned: { type: Schema.Types.Number, default: 0 },
    },
    { timestamps: true }
);
// updatedAt used to track the customer last check-in time.
// Use a different property if this document will be updated in some place other than check-in time.

schema.methods.getPointsToBeAdded = function() {
    if (this.pointsScheme.type === 'FIXED') {
        return this.pointsScheme.fixed ? (this.pointsScheme.fixed as number) : 0;
    } else if (this.type === 'PERCENTAGE_OF_BILL_VAL') {
        return 0;
    }
    return 0;
};

const dataModel = model<IVendorCustomer>('VendorCustomer', schema, 'vendor-customers_copy');
export default dataModel;

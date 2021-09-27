import { Document, model, Schema } from 'mongoose';

export enum VendorPointSchemeType {
    PERCENT_OF_BILL = 'PERCENT_OF_BILL',
    FIXED = 'FIXED',
}

export interface IVendor extends Document {
    fullName?: string;
    givenName: string;
    thumbnailImage: string;
    terminalImage: string;
    storageBucket: string;
    pointSchemes: Map<
        string,
        {
            type: VendorPointSchemeType;
            percentageOfBillValue?: number;
            fixed?: number;
            criteria?: object; // todo: maybe we can include direct user filtering queries?
        }
    >;
    enabled: boolean;
    pin?: string;
    getPointsToBeAdded: () => number;
}

const schema: Schema = new Schema(
    {
        fullName: { type: String },
        givenName: { type: String, required: true },
        thumbnailImage: { type: String, required: true },
        terminalImage: { type: String, required: true },
        storageBucket: { type: String, required: true },
        pointSchemes: {
            type: Map,
            // required: true,
            of: {
                type: { type: String, enum: Object.keys(VendorPointSchemeType), required: true },
                percentageOfBillValue: Number,
                fixed: Number,
            },
        },
        enabled: { type: Boolean, default: false },
        pin: String,
    },
    { timestamps: true }
);

schema.methods.getPointsToBeAdded = function(schemeName: string) {
    const scheme = this.pointSchemes.get(schemeName);
    if (scheme.type === VendorPointSchemeType.FIXED) {
        return scheme.fixed || 0;
    } else if (scheme.type === VendorPointSchemeType.PERCENT_OF_BILL) {
        return 0;
    }
    return 0;
};

// tslint:disable-next-line: variable-name
export const Vendor = model<IVendor>('Vendor', schema, 'vendors');

import { Document, model, Model, Schema, Types } from 'mongoose';

export interface IUserRedeemable extends Document {
    userId: Types.ObjectId;
    vendorId: Types.ObjectId;
    targetPoints: number;
    thumbnailImageUrl?: string;
    imageUrls?: string[];
    title: string;
    description?: string;
    expiryDate?: Date;
    redeemStatus: string;
}

const schema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true },
        vendorId: { type: Schema.Types.ObjectId, required: true },
        targetPoints: { type: Number, required: true },
        thumbnailImageUrl: { type: String },
        imageUrls: { type: Array },
        title: { type: String, required: true },
        description: { type: String },
        expiryDate: { type: Date },
        redeemStatus: {
            type: String,
            enum: ['LOCKED', 'UNLOCKED', 'EXPIRED', 'USED'],
            required: true,
        },
    },
    { timestamps: true }
);

schema.statics.findByUserAndVendor = (userId: Types.ObjectId, vendorId?: Types.ObjectId) => {
    const operations = [];
    if (vendorId) {
        operations.push({
            $match: {
                vendorId,
                userId,
            },
        });
    } else {
        operations.push({
            $match: {
                userId,
            },
        });
    }

    operations.push(
        {
            $lookup: {
                from: 'user-redeemables',
                let: {
                    user: '$userId',
                    vendor: '$vendorId',
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: ['$userId', '$$user'],
                                    },
                                    {
                                        $eq: ['$vendorId', '$$vendor'],
                                    },
                                ],
                            },
                        },
                    },
                ],
                as: 'redeemable',
            },
        },
        {
            $unwind: { path: '$redeemable' },
        },
        { $match: { 'redeemable.redeemStatus': { $in: ['LOCKED'] } } },
        {
            $project: {
                vendorId: 1,
                userId: 1,
                createdAt: 1,
                points: 1,
                totalPointsBurned: 1,
                totalPointsEarned: 1,
                pointsSchemeId: 1,
                updatedAt: 1,
                'redeemable._id': 1,
                'redeemable.thumbnailImageUrl': 1,
                'redeemable.imageUrls': 1,
                'redeemable.title': 1,
                'redeemable.description': 1,
                'redeemable.targetPoints': 1,
                'redeemable.expiryDate': 1,
                pointsToFulfill: {
                    $cond: {
                        if: {
                            $lte: [{ $subtract: ['$redeemable.targetPoints', '$points'] }, 0],
                        },
                        then: 0,
                        else: { $subtract: ['$redeemable.targetPoints', '$points'] },
                    },
                },
                'redeemable.redeemStatus': {
                    $cond: {
                        if: {
                            $lte: [{ $subtract: ['$redeemable.targetPoints', '$points'] }, 0],
                        },
                        then: 'UNLOCKED',
                        else: 'LOCKED',
                    },
                },
            },
        },
        { $sort: { pointsToFulfill: 1 } }
    );
    return model('VendorCustomer').aggregate(operations);
};

export type UserRedeemableSchema = Model<IUserRedeemable> & {
    findByUserAndVendor: (
        userId: Types.ObjectId,
        vendorId?: Types.ObjectId
    ) => Promise<
        Array<{
            vendorId: Types.ObjectId;
            userId: Types.ObjectId;
            createdAt: Date;
            points: number;
            totalPointsBurned: number;
            totalPointsEarned: number;
            pointsSchemeId: Types.ObjectId;
            updatedAt: Date;
            redeemable: IUserRedeemable;
            pointsToFulfill: number;
        }>
    >;
};

const userRedeemable = model<IUserRedeemable, UserRedeemableSchema>(
    'UserRedeemable',
    schema,
    'user-redeemables'
);

export default userRedeemable;

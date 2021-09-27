import { Document, model, Schema, Types } from 'mongoose';

export const NOTIFICATION_VIEW_STATUS = {
    LOADED: 'LOADED',
    VIEWED: 'VIEWED',
    NOT_VIEWED: 'NOT_VIEWED',
};

export interface IUserInAppNotification extends Document {
    id: Types.ObjectId;
    userId: Types.ObjectId;
    vendorId: Types.ObjectId;
    promotionId: Types.ObjectId;
    messageId: string;
    error: string;
    success: boolean;
    loadCount: number;
    viewCount: number;
    viewStatus: 'LOADED' | 'VIEWED' | 'NOT_VIEWED';
}

const schema: Schema = new Schema(
    {
        id: Schema.Types.ObjectId,
        userId: { type: Schema.Types.ObjectId, required: true },
        promotionId: { type: Schema.Types.ObjectId, required: true },
        vendorId: { type: Schema.Types.ObjectId, required: true },
        loadCount: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        viewStatus: {
            type: String,
            enum: [
                NOTIFICATION_VIEW_STATUS.LOADED,
                NOTIFICATION_VIEW_STATUS.VIEWED,
                NOTIFICATION_VIEW_STATUS.NOT_VIEWED,
            ],
            default: NOTIFICATION_VIEW_STATUS.NOT_VIEWED,
        },
        messageId: { type: String },
        error: { type: String },
        success: { type: Boolean, required: true },
    },
    { timestamps: true }
);

const userInAppNotification = model<IUserInAppNotification>(
    'UserInAppNotification',
    schema,
    'user-inapp-notifications'
);

export default userInAppNotification;

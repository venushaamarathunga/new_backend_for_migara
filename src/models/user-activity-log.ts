import { Document, model, Schema, Types } from 'mongoose';

const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const Long = mongoose.Schema.Types.Long;

export interface IUserActivityLog extends Document {
    action: UserActivityAction;
    userId: Types.ObjectId;
    dateTime: Date;
    vendorId?: Types.ObjectId;
    terminal?: string;
    points?: number;
    promotionId?: Types.ObjectId;
    redeemableId?: Types.ObjectId;
    timestampMillis?: number;
    cancelledActivityId?: Types.ObjectId;
    cancelledId?: number; // timestamp of cancelled time
    cancelledTimestampMillis?: Long; // timestamp of cancelled time
    cancelled?: boolean;
}

export enum UserActivityAction {
    new_cust_check_in = 'new_cust_check_in',
    repeat_cust_check_in = 'repeat_cust_check_in',
    promo_load = 'promo_load',
    promo_view = 'promo_view',
    redeemable_load = 'redeemable_load',
    redeemable_use = 'redeemable_use',
    check_in_cancel = 'check_in_cancel',
    redeemable_cancel = 'redeemable_cancel',
}

const schema: Schema = new Schema({
    action: {
        type: String,
        enum: Object.keys(UserActivityAction),
        required: true,
    },
    userId: { type: Types.ObjectId, required: true },
    dateTime: { type: Date, required: true },
    vendorId: Types.ObjectId,
    terminal: String,
    points: Number,
    promotionId: Types.ObjectId,
    redeemableId: Types.ObjectId,
    timestampMillis: {
        type: Long,
    }, // timestamp in milliseconds
    cancelledActivityId: Types.ObjectId,
    cancelledId: { type: Long }, // timestamp of cancelled check in
    cancelledTimestampMillis: { type: Long },
    cancelled: { type: Boolean, default: false },
});

schema.index({ cancelledActivityId: -1 });

// tslint:disable-next-line: variable-name
const UserActivityLog = model<IUserActivityLog>('UserActivityLog', schema, 'user-activiy-log_copy');

export default UserActivityLog;

import { response } from 'express';
import { Types } from 'mongoose';
import logger from '../../logger';
import models from '../../models';
import UserActivityLog, {
    IUserActivityLog,
    UserActivityAction,
} from '../../models/user-activity-log';
import { BadRequestError } from '../../utils/errors/BadRequestError';
import { InvalidArgumentError } from '../../utils/errors/InvalidArgumentError';

export function logCustomerCheckInActivity(
    userId: Types.ObjectId,
    vendorId: Types.ObjectId,
    terminal: string,
    points: number,
    timestampMillis: number, // timestamp in milliseconds
    cancelled: boolean,
    type: UserActivityAction,
    cancelledId: number // timestamp of cancelled check in
) {
    return new Promise((resolv, reject) => {
        models.UserActivityLog.findOneAndUpdate(
            {
                userId,
                terminal,
                timestampMillis,
            },
            {
                $set: { cancelled, cancelledId },
                $setOnInsert: {
                    action: type,
                    dateTime: new Date(timestampMillis),
                    userId,
                    vendorId,
                    terminal,
                    points,
                    timestampMillis,
                },
            },
            { upsert: true, new: true, rawResult: true }
        )
            .then(value => {
                resolv(value);
            })
            .catch(err => {
                reject(new BadRequestError('UserActivityLog not updated', err));
            });
    });
}

export function logCustomerCheckInCancel(
    userId: Types.ObjectId,
    cancelledId: number,
    cancelledTimestampMillis: number
) {
    return new Promise((resolv, reject) => {
        models.UserActivityLog.findOneAndUpdate(
            {
                timestampMillis: cancelledId,
                userId,
                cancelled: false,
                $or: [
                    { action: UserActivityAction.repeat_cust_check_in },
                    { action: UserActivityAction.new_cust_check_in },
                ],
            },
            {
                $set: {
                    cancelled: true,
                    cancelledTimestampMillis,
                },
            },
            { rawResult: true }
        )
            .then(value => {
                resolv({ ...value, cancelAttemptedTimestampMillis: cancelledTimestampMillis });
            })
            .catch(err => {
                reject(new BadRequestError('UserActivityLog not updated', err));
            });
    });
}

export function logNewCustomerCheckInActivity(
    userId: Types.ObjectId,
    vendorId: Types.ObjectId,
    terminal: string,
    points: number,
    timestampMillis: number // timestamp in milliseconds
) {
    return models.UserActivityLog.findOneAndUpdate(
        {
            userId,
            terminal,
            timestampMillis,
        },
        {
            $set: {},
            $setOnInsert: {
                action: UserActivityAction.new_cust_check_in,
                dateTime: new Date(timestampMillis),
                userId,
                vendorId,
                terminal,
                points,
                timestampMillis,
            },
        },
        { upsert: true, new: true, rawResult: true }
    );
}

export function logRepeatCustomerCheckInActivity(
    userId: Types.ObjectId,
    vendorId: Types.ObjectId,
    terminal: string,
    points: number,
    timestampMillis: number // timestamp in milliseconds
) {
    return models.UserActivityLog.findOneAndUpdate(
        {
            userId,
            terminal,
            timestampMillis,
        },
        {
            $set: {},
            $setOnInsert: {
                action: UserActivityAction.repeat_cust_check_in,
                dateTime: new Date(timestampMillis),
                userId,
                vendorId,
                terminal,
                points,
                timestampMillis,
            },
        },
        { upsert: true, new: true, rawResult: true }
    );
}

export function logPromotionsLoadedActivity(userId: Types.ObjectId, vendorId?: Types.ObjectId) {
    return new UserActivityLog({
        action: UserActivityAction.promo_load,
        dateTime: new Date(),
        userId,
        vendorId,
    }).save();
}

export function logPromotionViewedActivity(
    userId: Types.ObjectId,
    vendorId: Types.ObjectId,
    promotionId: Types.ObjectId
) {
    return new UserActivityLog({
        action: UserActivityAction.promo_view,
        dateTime: new Date(),
        userId,
        vendorId,
        promotionId,
    }).save();
}

export function logRedeemablesLoadedActivity(userId: Types.ObjectId, vendorId?: Types.ObjectId) {
    return new UserActivityLog({
        action: UserActivityAction.redeemable_load,
        dateTime: new Date(),
        userId,
        vendorId,
    }).save();
}

export function logRedeemableUsedActivity(
    userId: Types.ObjectId,
    vendorId: Types.ObjectId,
    redeemableId: Types.ObjectId,
    points: number,
    terminal: string
) {
    return new UserActivityLog({
        action: UserActivityAction.redeemable_use,
        dateTime: new Date(),
        userId,
        vendorId,
        redeemableId,
        points,
        terminal,
    }).save();
}

export function logUserCheckInCancellationActivity(activity: IUserActivityLog) {
    if (
        activity.action !== UserActivityAction.new_cust_check_in &&
        activity.action !== UserActivityAction.repeat_cust_check_in
    ) {
        throw new InvalidArgumentError('Invalid argument: activity');
    }
    return new UserActivityLog({
        action: UserActivityAction.check_in_cancel,
        dateTime: new Date(),
        userId: activity.userId,
        vendorId: activity.vendorId,
        terminal: activity.terminal,
        points: activity.points,
        cancelledActivityId: activity._id,
    }).save();
}

export function logRedeemableCancellationActivity(activity: IUserActivityLog) {
    if (activity.action !== UserActivityAction.redeemable_use) {
        throw new InvalidArgumentError('Invalid argument: activity');
    }
    return new UserActivityLog({
        action: UserActivityAction.redeemable_cancel,
        dateTime: new Date(),
        userId: activity.userId,
        vendorId: activity.vendorId,
        terminal: activity.terminal,
        points: activity.points,
        redeemableId: activity.redeemableId,
        cancelledActivityId: activity._id,
    }).save();
}

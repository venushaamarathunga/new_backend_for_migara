import { ObjectId } from 'bson';
import { DateTime } from 'luxon';
import { Error, Types } from 'mongoose';
import logger from '../logger';
import models, { parseObjectId } from '../models';
import { UserActivityAction } from '../models/user-activity-log';
import { NOTIFICATION_VIEW_STATUS } from '../models/user-inapp-notifications';
import PageResponse from '../paginations/PageResponse';
import UserPromotion from '../promotions/UserPromotion';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import { StorageHelper } from '../utils/storage/storage.service';
import {
    logPromotionsLoadedActivity,
    logPromotionViewedActivity,
} from './activity-log/user-activity-log.service';
import { InvalidUuidError } from './invalid-uuid-error';
import { getUserByUuid } from './user.service';

const LOG_LABEL = 'UserPromotionsService';

async function getVendorPromotion(
    userUuid: string,
    vId: string,
    page: number,
    pageSize: number,
    types: string[]
) {
    const userDetails = await getUserByUuid(userUuid);
    if (!userDetails) {
        throw new InvalidUuidError(400);
    }
    const userId = userDetails.id;
    const vendorId = parseObjectId(vId, ErrorCodes.VENDOR_ID_INVALID);

    const promotions = await models.UserInAppNotification.aggregate(
        getVendorPromotionCriteria(userId, vendorId, types)
    )
        .sort({ _id: -1 })
        .skip(page > 0 ? (page - 1) * pageSize : 0)
        .limit(pageSize);

    // patch user promotion with load count and view status
    for (const promotion of promotions) {
        // if (
        //     promotion.viewStatus === NOTIFICATION_VIEW_STATUS.VIEWED ||
        //     promotion.viewStatus === NOTIFICATION_VIEW_STATUS.LOADED
        // ) {
        await models.UserInAppNotification.updateOne(
            {
                userId,
                promotionId: promotion.promotionId,
            },
            {
                $inc: { loadCount: 1 },
            }
        );
        // } else {
        //     await models.UserInAppNotification.updateOne(
        //         {
        //             userId,
        //             promotionId: promotion.promotionId,
        //         },
        //         {
        //             $inc: { loadCount: 1 },
        //             $set: { viewStatus: NOTIFICATION_VIEW_STATUS.LOADED },
        //             $setOnInsert: {
        //                 userId,
        //                 vendorId,
        //                 promotionId: promotion.promotionId,
        //                 viewCount: 0,
        //             },
        //         },
        //         { upsert: true }
        //     );
        // }
    }

    if (promotions.length > 0) {
        logPromotionsLoadedActivity(userId, vendorId).catch(error => {
            logger.error(`Failed to log ${UserActivityAction.promo_load} activity`, {
                label: LOG_LABEL,
                error,
            });
        });
    }

    const promotionData = promotionDetails(promotions);
    const promotionCriteria: any[] = getVendorPromotionCriteria(userId, vendorId, types);
    for (const countElement of getCountElement()) {
        promotionCriteria.push(countElement);
    }

    const totalElements = await models.UserInAppNotification.aggregate(promotionCriteria);
    const totalElementCount: number = totalElements.length > 0 ? totalElements[0].count : 0;

    const pageResponse = new PageResponse(page, pageSize, totalElementCount, promotionData);
    return pageResponse;
}

async function updatePromotionViewCount(userUuid: string, promotionId: string) {
    try {
        const userDetails = await getUserByUuid(userUuid);
        if (!userDetails) {
            throw new InvalidUuidError(400);
        }
        const userId = userDetails.id;

        // patch user promotion with view count and view status
        const entry = await models.UserInAppNotification.findOneAndUpdate(
            { userId, promotionId },
            {
                $inc: { viewCount: 1 },
                $set: { viewStatus: NOTIFICATION_VIEW_STATUS.VIEWED },
            },
            {
                new: true,
                rawResult: true,
            }
        );
        if (entry.ok) {
            logPromotionViewedActivity(userId, entry.value.vendorId, entry.value.promotionId).catch(
                error => {
                    logger.error(`Failed to log ${UserActivityAction.promo_view} activity`, {
                        label: LOG_LABEL,
                        error,
                    });
                }
            );
            logger.info(`View count incremented for user ${userId} and promotion ${promotionId}`);
            return { success: true };
        }
        return { success: false };
    } catch (error) {
        if (error instanceof Error.CastError) {
            // invalid promotion id
            logger.warn(`View count update attempted for invalid promotion id ${promotionId}`);
            return { success: false };
        } else {
            throw error;
        }
    }
}

async function getUserPromotion(userUuid: string, page: number, pageSize: number, types: string[]) {
    const userDetails = await getUserByUuid(userUuid);

    if (!userDetails) {
        throw new InvalidUuidError(400);
    }

    const userId = userDetails.id;

    const promotions = await models.UserInAppNotification.aggregate(
        getUserPromotionCriteria(userId, types)
    )
        .sort({ _id: -1 })
        .skip(page > 0 ? (page - 1) * pageSize : 0)
        .limit(pageSize);

    // patch user promotion with load count and view status
    for (const promotion of promotions) {
        await models.UserInAppNotification.updateOne(
            {
                userId,
                promotionId: promotion.promotionId,
            },
            {
                $inc: { loadCount: 1 },
            }
        );
        /* await models.UserInAppNotification.updateOne(
            {
                userId,
                promotionId: promotion.promotionId,
                viewStatus: {
                    $in: [NOTIFICATION_VIEW_STATUS.VIEWED, NOTIFICATION_VIEW_STATUS.LOADED],
                },
            },
            {
                $inc: { loadCount: 1 },
            },
            { upsert: true }
        );

        await models.UserInAppNotification.updateOne(
            {
                userId,
                promotionId: promotion.promotionId,
                viewStatus: NOTIFICATION_VIEW_STATUS.NOT_VIEWED,
            },
            {
                $inc: { loadCount: 1 },
                $set: { viewStatus: NOTIFICATION_VIEW_STATUS.LOADED },
                $setOnInsert: {
                    userId,
                    vendorId: promotion.vendorId,
                    promotionId: promotion.promotionId,
                    viewCount: 0,
                },
            },
            { upsert: true }
        ); */
    }

    if (promotions.length > 0) {
        logPromotionsLoadedActivity(userId).catch(error => {
            logger.error(`Failed to log ${UserActivityAction.promo_load} activity`, {
                label: LOG_LABEL,
                error,
            });
        });
    }

    const promotionData = promotionDetails(promotions);

    const promotionCriteria: any[] = getUserPromotionCriteria(userId, types);
    for (const countElement of getCountElement()) {
        promotionCriteria.push(countElement);
    }

    const totalElements = await models.UserInAppNotification.aggregate(promotionCriteria);
    const totalElementCount: number = totalElements.length > 0 ? totalElements[0].count : 0;

    const pageResponse = new PageResponse(page, pageSize, totalElementCount, promotionData);
    return pageResponse;
}

function promotionDetails(promotions: any) {
    const promotionElemets: UserPromotion[] = [];
    const storage = StorageHelper.getInstance();

    for (let i = 0; i < promotions.length; i++) {
        const promotionData = promotions[i].promotionDetails;
        const promotionElemetData = new UserPromotion(promotionData._id);
        promotionElemetData.vendorName = promotionData.vendorDetails
            ? promotionData.vendorDetails.givenName
            : null;
        promotionElemetData.title = promotionData.title;
        promotionElemetData.thumbnailImageUrl = promotionData.storageBucket
            ? storage.getPublicUrlForResource(
                  promotionData.storageBucket,
                  promotionData.thumbnailImageUrl
              )
            : promotionData.thumbnailImageUrl;
        promotionElemetData.imageUrls = [];
        for (let j = 0, len = promotionData.imageUrls.length; j < len; j++) {
            promotionElemetData.imageUrls.push(
                promotionData.storageBucket
                    ? storage.getPublicUrlForResource(
                          promotionData.storageBucket,
                          promotionData.imageUrls[j]
                      )
                    : promotionData.imageUrls[j]
            );
        }
        promotionElemetData.description = promotionData.description;
        promotionElemetData.expiresAt = promotionData.expiresAt;
        promotionElemetData.scheduledDate = promotionData.scheduledDate;
        promotionElemetData.targetAllFlavaCustomers = promotionData.targetAllFlavaCustomers;
        promotionElemetData.executed = promotionData.executed;
        promotionElemetData.pricingModel = promotionData.pricingModel;
        // promotionElemetData.tags = promotionData.tags;
        promotionElemetData.webUrl = promotionData.webUrl;
        promotionElemetData.type = promotionData.type || 'promo';
        promotionElemetData.tags = [];
        if (DateTime.fromJSDate(promotionData.scheduledDate).plus({ days: 15 }) >= DateTime.utc()) {
            promotionElemetData.tags.push('NEW');
        }
        if (promotionData.pricingModel && promotionData.pricingModel.type === 'discount') {
            promotionElemetData.tags.push('%');
        }
        promotionElemets[i] = promotionElemetData;
    }
    return promotionElemets;
}

function getVendorPromotionCriteria(userId: ObjectId, vendorId: ObjectId, types: string[] = []) {
    const filterCriteria: any = { 'promotionDetails.expiresAt': { $gte: new Date() } };
    if (types && types.length > 0) {
        filterCriteria['promotionDetails.type'] = { $in: types };
    }
    return [
        {
            $match: {
                userId,
                vendorId,
            },
        },
        {
            $lookup: {
                from: 'promotion-campaigns',
                localField: 'promotionId',
                foreignField: '_id',
                as: 'promotionDetails',
            },
        },
        { $unwind: '$promotionDetails' },
        // { $replaceRoot: { newRoot: '$promotionDetails' } },
        { $sort: { 'promotionDetails.scheduledDate': -1 } },
        { $match: filterCriteria },
    ];
}

function getCountElement() {
    return [
        {
            $count: 'count',
        },
    ];
}

function getUserPromotionCriteria(userId: ObjectId, types: string[] = []) {
    const filterCriteria: any = { 'promotionDetails.expiresAt': { $gte: new Date() } };
    if (types && types.length > 0) {
        filterCriteria['promotionDetails.type'] = { $in: types };
    }
    return [
        { $match: { userId } },
        {
            $lookup: {
                from: 'promotion-campaigns',
                localField: 'promotionId',
                foreignField: '_id',
                as: 'promotionDetails',
            },
        },
        { $unwind: '$promotionDetails' },
        // { $replaceRoot: { newRoot: '$promotionDetails' } },
        { $sort: { 'promotionDetails.scheduledDate': -1 } },
        { $match: filterCriteria },
        {
            $lookup: {
                from: 'vendors',
                localField: 'vendorId',
                foreignField: '_id',
                as: 'vendorDetails',
            },
        },
        { $unwind: '$vendorDetails' },
    ];
}

export const userPromotionService = {
    getUserPromotion,
    getVendorPromotion,
    promotionDetails,
    updatePromotionViewCount,
};

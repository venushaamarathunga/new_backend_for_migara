import { ObjectId } from 'bson';
import mongoose, { model } from 'mongoose';
import logger from '../logger';
import models, { parseObjectId } from '../models';
import { UserActivityAction } from '../models/user-activity-log';
import { IUserRedeemable } from '../models/user-redeemables';
import { VendorAuthClient } from '../models/vendor-auth-client';
import PageResponse from '../paginations/PageResponse';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import {
    logRedeemablesLoadedActivity,
    logRedeemableUsedActivity,
} from './activity-log/user-activity-log.service';
import { InvalidUuidError } from './invalid-uuid-error';
import RedeemableItem from './redeemables/redeemable-item/RedeemableItem';
import { getUserByUuid } from './user.service';
import UserRegisteredVendor from './vendors/UserRegisteredVendor';

const LOG_LABEL = 'UserRedeemableService';

export function changeRedeemStatus(payload: {
    id: string;
    uuid: string;
    clientId: string;
    status: string;
    pin: string;
}) {
    return new Promise<RedeemableItem>(async (resolve, reject) => {
        const vendorDetails = await VendorAuthClient.findVendorByClientId(payload.clientId);

        if (!payload.status) {
            return reject(
                new BadRequestError(
                    'Required redeemSatus is missing',
                    ErrorCodes.REDEEMABLE_ITEM_REDEEMSTATUS_MISSING
                )
            );
        }
        if (!payload.pin) {
            return reject(
                new BadRequestError(
                    'Required pin is missing',
                    ErrorCodes.REDEEMABLE_ITEM_PIN_MISSING
                )
            );
        }
        if (payload.pin !== vendorDetails.pin) {
            return reject(
                new BadRequestError('Incorrect pin', ErrorCodes.REDEEMABLE_ITEM_PIN_INCORRECT)
            );
        }

        models.UserRedeemable.findOne({ _id: parseObjectId(payload.id) })
            .then(redeemItemDetails => {
                if (redeemItemDetails === null) {
                    throw new BadRequestError(
                        'Required redeemable item',
                        ErrorCodes.REDEEMABLE_ITEM_MISSING
                    );
                }

                return Promise.all([redeemItemDetails, getUserByUuid(payload.uuid)]);
            })
            .then(([redeemItemDetails, userDetails]) => {
                if (
                    !redeemItemDetails.vendorId.equals(vendorDetails._id) ||
                    !redeemItemDetails.userId.equals(userDetails.id)
                ) {
                    throw new BadRequestError(
                        'You are not allowed to use this redeemable item',
                        ErrorCodes.REDEEMABLE_ITEM_FORBIDDEN
                    );
                }
                return Promise.all([
                    redeemItemDetails,
                    models.VendorCustomer.findOne({
                        vendorId: vendorDetails._id,
                        userId: userDetails.id,
                    }),
                ]);
            })
            .then(([redeemItemDetails, vendorCustomerDetails]) => {
                const originalPoints = vendorCustomerDetails.points;
                const originaltotalPointsBurned = vendorCustomerDetails.totalPointsBurned;
                if (originalPoints <= redeemItemDetails.targetPoints) {
                    return reject(
                        new BadRequestError(
                            'Not enough point to redeem that item',
                            ErrorCodes.REDEEMABLE_ITEM_NOT_ENOUGH_POINTS
                        )
                    );
                }
                if (redeemItemDetails.redeemStatus === 'USED') {
                    logger.info(
                        `redeem status already updated as 'USED' and redeemble id ${redeemItemDetails._id}`
                    );
                    return resolve(mappingRedeemDto(redeemItemDetails));
                }
                vendorCustomerDetails.points = originalPoints - redeemItemDetails.targetPoints;
                vendorCustomerDetails.totalPointsBurned =
                    originaltotalPointsBurned + redeemItemDetails.targetPoints;
                return vendorCustomerDetails.save().then(() => {
                    let redeemableUpdated = false;
                    const currentRedeemableStatus = redeemItemDetails.redeemStatus;

                    redeemItemDetails.redeemStatus = payload.status;
                    redeemItemDetails
                        .save()
                        .then(() => {
                            redeemableUpdated = true;
                            logger.info(`updated redeemable item ${redeemItemDetails.id}`);

                            return logRedeemableUsedActivity(
                                redeemItemDetails.userId,
                                redeemItemDetails.vendorId,
                                redeemItemDetails._id,
                                redeemItemDetails.targetPoints,
                                payload.clientId
                            );
                        })
                        .then(() => {
                            return resolve(mappingRedeemDto(redeemItemDetails));
                        })
                        .catch((err: any) => {
                            if (redeemableUpdated) {
                                redeemItemDetails.redeemStatus = currentRedeemableStatus;
                                redeemItemDetails.save();
                            }
                            vendorCustomerDetails.points = originalPoints;
                            vendorCustomerDetails.totalPointsBurned = originaltotalPointsBurned;
                            vendorCustomerDetails.save();
                            return reject(
                                new BadRequestError('Redeem item status not update', err)
                            );
                        });
                });
            })
            .catch((errorCode: any) => {
                return reject(errorCode);
            });
    });
}

export async function getVendorRedeemable(
    uuid: string,
    vId: string,
    page: number,
    pageSize: number
) {
    try {
        const userDetails = await getUserByUuid(uuid);
        if (!userDetails) {
            throw new InvalidUuidError(400);
        }
        const userId = userDetails.id;
        const vendorId = parseObjectId(vId, ErrorCodes.VENDOR_ID_INVALID);

        const redeemableItemData: RedeemableItem[] = await getRedeemables(
            userId,
            vendorId,
            page,
            pageSize
        );
        const totalCount = await getTotalCount(userId, vendorId);

        if (redeemableItemData.length > 0) {
            logRedeemablesLoadedActivity(userId, vendorId).catch(error => {
                logger.error(`Failed to log ${UserActivityAction.redeemable_load} activity`, {
                    label: LOG_LABEL,
                    error,
                });
            });
        }

        const redeemable = new PageResponse(page, pageSize, totalCount, redeemableItemData);

        return redeemable;
    } catch (e) {
        throw e;
    }
}

export async function getUserRegisteredVendor(
    uuid: string,
    vId: string,
    page: number,
    pageSize: number,
    includeRedeemable: boolean
) {
    const userRegisteredVendor = new UserRegisteredVendor();
    if (page === 1) {
        try {
            const userDetails = await getUserByUuid(uuid);
            if (!userDetails) {
                throw new InvalidUuidError(400);
            }
            const userId = userDetails.id;
            const vendorId = parseObjectId(vId, ErrorCodes.VENDOR_ID_INVALID);

            const giftsCollectedCount = await models.UserRedeemable.find({
                userId,
                vendorId,
                redeemStatus: 'USED',
            }).countDocuments();

            const vendorCustomerDetails = await models.VendorCustomer.find({ userId, vendorId });

            const vendorCustomerPoints =
                vendorCustomerDetails.length > 0 ? vendorCustomerDetails[0].points : 0;

            const nextGift = await models.UserRedeemable.aggregate(
                getPointRequiredToNextGiftCriteria(userId, vendorId, vendorCustomerPoints)
            );

            userRegisteredVendor.giftsCollected = giftsCollectedCount;
            userRegisteredVendor.pointsRequiredForNextGift =
                nextGift.length > 0 ? nextGift[0].pointsToFulfill : 0;
            userRegisteredVendor.progressToNextGift =
                nextGift.length > 0 ? (vendorCustomerPoints / nextGift[0].targetPoints) * 100 : 0;
            userRegisteredVendor.pointsEarned = vendorCustomerPoints;
        } catch (e) {
            throw e;
        }
    }
    try {
        if (includeRedeemable) {
            const redeemableDetails = await getVendorRedeemable(uuid, vId, page, pageSize);
            userRegisteredVendor.pagination = redeemableDetails.pagination;
            userRegisteredVendor.redeemables = redeemableDetails.data;
        }

        return userRegisteredVendor;
    } catch (e) {
        throw e;
    }
}

function mappingRedeemDto(redeemItem: IUserRedeemable) {
    const redeemableItemDetails = new RedeemableItem(redeemItem.id);
    redeemableItemDetails.title = redeemItem.title;
    redeemableItemDetails.description = redeemItem.description;
    redeemableItemDetails.expiryDate = redeemItem.expiryDate;
    redeemableItemDetails.imageUrls = redeemItem.imageUrls;
    redeemableItemDetails.redeemStatus = redeemItem.redeemStatus;
    redeemableItemDetails.thumbnailImageUrl = redeemItem.thumbnailImageUrl;

    return redeemableItemDetails;
}

async function getRedeemables(
    userId: ObjectId,
    vendorId: ObjectId,
    page: number,
    pageSize: number
) {
    try {
        const userCriteria: any[] = getUserCriteria(userId, vendorId);

        for (const iterator of getUpdateStatusAndPointFulFillCriteria()) {
            userCriteria.push(iterator);
        }

        const redeemableArray = await models.VendorCustomer.aggregate(userCriteria)
            .skip(page > 0 ? (page - 1) * pageSize : 0)
            .limit(pageSize);

        const redeemableItem: RedeemableItem[] = [];

        for (let i = 0; i < redeemableArray.length; i++) {
            const redeemableArrayData = redeemableArray[i];
            const redeemableItemData = mappingRedeemDto(redeemableArrayData.redeemable);
            redeemableItemData.targetPoints = redeemableArrayData.redeemable.targetPoints;
            redeemableItemData.pointsToFulfill = redeemableArrayData.pointsToFulfill;
            redeemableItem[i] = redeemableItemData;
        }
        return redeemableItem;
    } catch (e) {
        throw e;
    }
}

async function getTotalCount(userId: ObjectId, vendorId: ObjectId) {
    try {
        const userCriteria: any[] = getUserCriteria(userId, vendorId);
        for (const countElement of getCountElement()) {
            userCriteria.push(countElement);
        }

        const totalElements = await models.VendorCustomer.aggregate(userCriteria);

        if (totalElements.length === 0) {
            return 0;
        }
        return totalElements[0].count;
    } catch (e) {
        throw e;
    }
}

function getCountElement() {
    return [
        {
            $count: 'count',
        },
    ];
}

function getUserCriteria(userId: ObjectId, vendorId: ObjectId) {
    return [
        {
            $match: {
                vendorId,
                userId,
            },
        },
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
    ];
}

function getUpdateStatusAndPointFulFillCriteria() {
    return [
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
        { $sort: { pointsToFulfill: 1 } },
    ];
}

function getPointRequiredToNextGiftCriteria(
    userId: ObjectId,
    vendorId: ObjectId,
    userPoints: number
) {
    return [
        {
            $match: {
                userId,
                vendorId,
                redeemStatus: 'LOCKED',
            },
        },
        {
            $project: {
                targetPoints: 1,
                pointsToFulfill: {
                    $cond: {
                        if: {
                            $lte: [{ $subtract: ['$targetPoints', userPoints] }, 0],
                        },
                        then: 0,
                        else: { $subtract: ['$targetPoints', userPoints] },
                    },
                },
                redeemStatus: {
                    $cond: {
                        if: {
                            $lte: [{ $subtract: ['$targetPoints', userPoints] }, 0],
                        },
                        then: 'UNLOCKED',
                        else: 'LOCKED',
                    },
                },
            },
        },
        { $sort: { pointsToFulfill: 1 } },
        { $match: { redeemStatus: 'LOCKED' } },
        { $limit: 1 },
    ];
}

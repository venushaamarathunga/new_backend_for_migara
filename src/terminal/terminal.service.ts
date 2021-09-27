import { ObjectId } from 'bson';
import { Types } from 'mongoose';
import validate from 'uuid-validate';
import logger from '../logger';
import models, { parseObjectId } from '../models';
import { OAuthClient, OAuthClientRole } from '../models/oauth-client';
import UserActivityLog, { IUserActivityLog, UserActivityAction } from '../models/user-activity-log';
import { IVendor, Vendor } from '../models/vendor';
import { IVendorAuthClient, VendorAuthClient } from '../models/vendor-auth-client';
import { VendorCard } from '../models/vendor-cards';
import { IVendorCustomer } from '../models/vendor-customer';
import { IVendorPointsScheme } from '../models/vendor-points-scheme';
import {
    logCustomerCheckInActivity,
    logCustomerCheckInCancel,
    logNewCustomerCheckInActivity,
    logRedeemableCancellationActivity,
    logRepeatCustomerCheckInActivity,
    logUserCheckInCancellationActivity,
} from '../user/activity-log/user-activity-log.service';
import { CheckedInConsumer } from '../user/CheckedInConsumer';
import { getUserByUuidWithCheckinTime } from '../user/user.service';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import { StorageHelper } from '../utils/storage/storage.service';
import { generateRandomString } from '../utils/string/string.utils';
import { InterTerminalVendorCardUsageError } from './inter-terminal-vendor-card-usage.error';
import { InvalidVendorCardError } from './invalid-vendor-card.error';
import { TerminalActivity } from './TerminalActivity';

const TERMINAL_ID_LENGTH = 8;

export async function addTerminalToVendor(prop: {
    cardId: string;
    deviceId: string;
    clientId?: string;
    branch?: string;
}) {
    if (!validate(prop.cardId)) {
        throw new InvalidVendorCardError();
    }

    if (typeof prop.clientId === 'string' && prop.clientId.length !== TERMINAL_ID_LENGTH) {
        throw new BadRequestError('Invalid parameters', ErrorCodes.TERMINAL_ID_INVALID);
    }

    return VendorAuthClient.findOne({ cardUuid: prop.cardId }).then(terminal => {
        if (terminal === null) {
            return createTerminal(prop);
        }

        if (terminal.clientId !== prop.clientId || terminal.deviceId !== prop.deviceId) {
            throw new InterTerminalVendorCardUsageError(prop.cardId, prop.deviceId);
        }

        return getTerminalConfiguration(terminal);
    });
}

export async function getLast5ActivitiesOfTerminal(clientId: string) {
    if (!clientId) {
        throw new BadRequestError('Invalid parameters', ErrorCodes.TERMINAL_ID_INVALID);
    }

    // expecting actions 'new_cust_check_in', 'repeat_cust_check_in', 'redeemable_use'
    return UserActivityLog.find({ terminal: clientId })
        .sort({ dateTime: -1 })
        .limit(5)
        .then(activities => {
            const last5Activities = [];
            for (const activity of activities) {
                last5Activities.push(
                    new TerminalActivity(activity.action, activity.dateTime, activity._id)
                );
            }
            return last5Activities;
        })
        .catch(e => {
            throw e;
        });
}

export function cancelActivityFromTerminal(
    clientId: string,
    activityId: string,
    cardUuid: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const id = parseObjectId(activityId, ErrorCodes.USER_ACTIVITY_ID_INVALID);
        VendorAuthClient.findOne({ clientId })
            .then(terminal => {
                if (terminal.cardUuid !== cardUuid) {
                    throw new InterTerminalVendorCardUsageError(cardUuid);
                }
                return UserActivityLog.exists({ cancelledActivityId: id });
            })
            .then(exists => {
                if (exists) {
                    return resolve();
                }
                UserActivityLog.findById(id)
                    .then(userActivity => {
                        if (!userActivity) {
                            throw new BadRequestError(
                                'Invalid parameter: activity',
                                ErrorCodes.USER_ACTIVITY_ID_INVALID
                            );
                        }

                        if (userActivity.terminal && userActivity.terminal !== clientId) {
                            throw new BadRequestError(
                                'Invalid parameter: activity',
                                ErrorCodes.USER_ACTIVITY_UPDATE_ATTEMPTED_FROM_UNAUTHORIZED_TERMINAL
                            );
                        }

                        if (
                            userActivity.action === UserActivityAction.new_cust_check_in ||
                            userActivity.action === UserActivityAction.repeat_cust_check_in
                        ) {
                            handleCustomerCheckInCancellation(userActivity, resolve, reject);
                        } else if (userActivity.action === UserActivityAction.redeemable_use) {
                            handleRedeemableCancellation(userActivity, resolve, reject);
                        } else {
                            return resolve();
                        }
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
}

async function createTerminal(prop: {
    cardId: string;
    deviceId: string;
    clientId?: string;
    branch?: string;
}) {
    return VendorCard.findOne({ uuid: prop.cardId, used: false })
        .then(vendorCard => {
            if (vendorCard == null) {
                throw new InvalidVendorCardError();
            }

            const clientId = prop.clientId || generateRandomString(TERMINAL_ID_LENGTH);
            // create oauth client
            return Promise.all([
                vendorCard,
                new OAuthClient({
                    clientId,
                    grants: ['refresh_token', 'client_credentials', 'authorization_code'],
                    isPublic: true,
                    redirectUris: [],
                    roles: [OAuthClientRole.TERMINAL],
                }).save(),
            ]);
        })
        .then(([vendorCard, authClient]) => {
            // create terminal
            return new VendorAuthClient({
                vendorId: vendorCard.vendorId,
                clientId: authClient.clientId,
                deviceId: prop.deviceId,
                cardUuid: prop.cardId,
                branch: prop.branch,
            }).save();
        })
        .then(terminalClient => {
            // update vendor card as used
            return Promise.all([
                terminalClient,
                VendorCard.updateOne({ uuid: prop.cardId }, { used: true }),
            ]);
        })
        .then(([terminalClient]) => {
            return getTerminalConfiguration(terminalClient);
        })
        .catch(e => {
            throw e;
        });
}

async function getTerminalConfiguration(terminalClient: IVendorAuthClient) {
    return Vendor.findById(terminalClient.vendorId)
        .then(vendor => {
            if (vendor === null) {
                return {
                    clientId: terminalClient.clientId,
                };
            }
            return {
                clientId: terminalClient.clientId,
                vendor: {
                    name: vendor.givenName,
                    imageUrl: vendor.storageBucket
                        ? StorageHelper.getInstance().getPublicUrlForResource(
                              vendor.storageBucket,
                              vendor.terminalImage
                          )
                        : vendor.terminalImage,
                },
            };
        })
        .catch(e => {
            throw e;
        });
}

export async function syncCheckIns(
    clientId: string,
    checkIns: Array<{ uuid: string; utcTimestamp: number; cancelled: boolean; cancelledId: number }>
): Promise<
    Array<{
        utcTimestamp: number;
        uploaded: boolean;
        error: string;
        isNewCustomer: boolean;
    }>
> {
    const checkInLogs: Array<{
        utcTimestamp: number;
        uploaded: boolean;
        error: string;
    }> = [];
    let currentVendor: IVendor;
    let commonVendorPointScheme: IVendorPointsScheme;
    return new Promise(async (resolve, reject) => {
        if (!clientId) {
            return reject(
                new BadRequestError(
                    'Missing parameter: `clientId`',
                    ErrorCodes.UNAUTHORIZE_MISSING_PARAMETER_CLIENT_ID
                )
            );
        }

        if (!checkIns) {
            return reject(
                new BadRequestError(
                    'Missing parameter: checkIns `[{ uuid: string; utcTimestamp: number }]`',
                    ErrorCodes.CHECK_INS_INVALID
                )
            );
        }

        VendorAuthClient.findVendorByClientId(clientId)
            .then(vendor => {
                if (!vendor) {
                    throw new BadRequestError(
                        'Invalid client',
                        ErrorCodes.AUTH_CLIENT_CREDENTIAL_INVALID
                    );
                }
                currentVendor = vendor;
                const pointsScheme: Promise<
                    IVendorPointsScheme
                > = models.VendorPointsScheme.findMatchingPointsScheme(vendor);

                return Promise.all([vendor, pointsScheme]);
            })
            .then(([vendor, pointsScheme]) => {
                let adjustment = 0;
                let checkinIntervelInSeconds = 0;

                if (!pointsScheme) {
                    logger.warn(
                        `No points were added to customer.` +
                            ` since a point scheme could not be found for vendor ${vendor.givenName}`
                    );
                } else {
                    commonVendorPointScheme = pointsScheme;
                    logger.debug(
                        `Calculating points to be added to customer based on point scheme ${pointsScheme._id}`
                    );
                    adjustment = pointsScheme.getPointsToBeAdded();
                    checkinIntervelInSeconds = pointsScheme.checkinIntervelInSeconds;
                }
                const checkinIntervelInMilliSeconds = checkinIntervelInSeconds * 1000;

                // sort by utcTimestamp
                checkIns.sort((a, b) => {
                    return a.utcTimestamp - b.utcTimestamp;
                });

                const filteredCheckins: Array<{
                    uuid: string;
                    utcTimestamp: number;
                    cancelled: boolean;
                    cancelledId: number;
                }> = [];
                let lastUuid = '';
                let lastTimestamp = 0;
                const cancelledIds: string[] = [];
                checkIns.forEach(checkIn => {
                    const uuid = checkIn.uuid;
                    const utcTimestamp = checkIn.utcTimestamp;
                    const diff = utcTimestamp - lastTimestamp;

                    let msg = 'duplicate';

                    // check validity against timastamp difference
                    // else check if not the same user
                    // else check cancelled action
                    // else cancelling action
                    if (diff > checkinIntervelInMilliSeconds) {
                        filteredCheckins.push(checkIn);
                        msg = null;
                    } else if (lastUuid !== uuid) {
                        filteredCheckins.push(checkIn);
                        msg = null;
                    } else if (checkIn.cancelled) {
                        filteredCheckins.push(checkIn);
                        msg = null;
                    } else if (
                        checkIn.cancelledId &&
                        !cancelledIds.includes(checkIn.cancelledId.toString())
                    ) {
                        filteredCheckins.push(checkIn);
                        msg = null;
                        cancelledIds.push(checkIn.cancelledId.toString());
                    }
                    checkInLogs.push({ utcTimestamp, error: msg, uploaded: false });
                    lastUuid = uuid;
                    lastTimestamp = utcTimestamp;
                });
                const promises = filteredCheckins.map(checkIn =>
                    getUserByUuidWithCheckinTime(
                        checkIn.uuid,
                        checkIn.utcTimestamp,
                        adjustment,
                        currentVendor._id,
                        checkIn.cancelled,
                        checkIn.cancelledId
                    )
                );
                return Promise.all(promises);
            })
            .then(checkedInConsumers => {
                const newVendorCreatedUsers: string[] = [];
                return new Promise(async (res, rej) => {
                    try {
                        // tslint:disable-next-line: prefer-for-of
                        for (let index = 0; index < checkedInConsumers.length; index++) {
                            const checkedInConsumer = checkedInConsumers[index];
                            if (checkedInConsumer.id == null) {
                                const log = checkInLogs.find(
                                    checkInLog =>
                                        checkInLog.utcTimestamp ===
                                        checkedInConsumer.checkedInTimestampMillis
                                );
                                log.error = 'no user for uuid';
                                continue;
                            }
                            if (
                                checkedInConsumer.vendorCustomer === null &&
                                !newVendorCreatedUsers.includes(checkedInConsumer.id.toHexString())
                            ) {
                                logger.info(
                                    `New customer ${checkedInConsumer.uuid} check-in at vendor ${currentVendor.givenName}`
                                );
                                await new models.VendorCustomer({
                                    userId: new ObjectId(checkedInConsumer.id),
                                    vendorId: currentVendor._id,
                                    points: 0,
                                    pointsSchemeId: commonVendorPointScheme._id,
                                }).save();
                                newVendorCreatedUsers.push(checkedInConsumer.id.toHexString());
                            }
                        }
                        // filter null values
                        const filteredCheckedInConsumers = checkedInConsumers.filter(el => {
                            return el.id != null;
                        });
                        res(filteredCheckedInConsumers);
                    } catch (err) {
                        rej(err);
                    }
                });
            })
            .then(async (checkedInConsumers: CheckedInConsumer[]) => {
                const activities: any[] = [];
                const newlyCreatedVendorCustomers: string[] = [];
                // tslint:disable-next-line: prefer-for-of
                for (let index = 0; index < checkedInConsumers.length; index++) {
                    const checkedInConsumer = checkedInConsumers[index];
                    let activity;
                    const isNewCustomer = checkedInConsumer.vendorCustomer === null;
                    const cancelled = checkedInConsumer.cancelled;
                    const cancelledId = checkedInConsumer.cancelledId || null;
                    const vendorCustomerKey =
                        checkedInConsumer.id + '#' + checkedInConsumer.vendorId;

                    if (cancelledId) {
                        const cancelCheckInLog = logCustomerCheckInCancel(
                            checkedInConsumer.id,
                            cancelledId,
                            checkedInConsumer.checkedInTimestampMillis
                        );
                        activities.push(cancelCheckInLog);
                    } else {
                        // check new customer and first transaction
                        // else second, third or ... transaction
                        if (
                            isNewCustomer &&
                            !newlyCreatedVendorCustomers.includes(vendorCustomerKey)
                        ) {
                            activity = logCustomerCheckInActivity(
                                checkedInConsumer.id,
                                new ObjectId(checkedInConsumer.vendorId),
                                clientId,
                                checkedInConsumer.adjustment,
                                checkedInConsumer.checkedInTimestampMillis,
                                cancelled,
                                UserActivityAction.new_cust_check_in,
                                cancelledId
                            );
                            newlyCreatedVendorCustomers.push(vendorCustomerKey);
                        } else {
                            const pointsSchemeForConsumer: IVendorPointsScheme = await models.VendorPointsScheme.findMatchingPointsScheme(
                                currentVendor
                            );
                            const point =
                                pointsSchemeForConsumer !== null
                                    ? pointsSchemeForConsumer.getPointsToBeAdded()
                                    : 0;
                            activity = logCustomerCheckInActivity(
                                checkedInConsumer.id,
                                new ObjectId(checkedInConsumer.vendorId),
                                clientId,
                                point,
                                checkedInConsumer.checkedInTimestampMillis,
                                cancelled,
                                UserActivityAction.repeat_cust_check_in,
                                cancelledId
                            );
                        }
                        activities.push(activity);
                    }
                }
                return Promise.all(activities);
            })
            .then(async activities => {
                const updateInfoList: any[] = [];

                // tslint:disable-next-line: prefer-for-of
                for (let index = 0; index < activities.length; index++) {
                    const activity = activities[index];
                    const lastErrorObject = activity.lastErrorObject;
                    const value = activity.value;
                    const updatedExisting = lastErrorObject.updatedExisting;
                    const upserted = lastErrorObject.upserted;

                    if (value === null && !updatedExisting) {
                        updateInfoList.push({
                            utcTimestamp: activity.cancelAttemptedTimestampMillis,
                            uploaded: false,
                            error: 'invalid cancel attempt',
                        });
                        continue;
                    }

                    const cancelled = value.cancelled;

                    if (!updatedExisting && upserted !== null) {
                        const timestampMillis = value.timestampMillis;
                        const userId = value.userId;
                        const vendorId = value.vendorId;
                        const points = value.points;
                        const _vendorCustomer = await models.VendorCustomer.findOneAndUpdate(
                            {
                                userId,
                                vendorId,
                            },
                            {
                                $inc: { totalPointsEarned: points, points },
                            },
                            { rawResult: true }
                        );
                        updateInfoList.push({
                            utcTimestamp: timestampMillis,
                            uploaded: updatedExisting || upserted !== null,
                            error: null,
                            isNewCustomer: _vendorCustomer.value.points === 0,
                        });
                    } else if (updatedExisting && !cancelled) {
                        const timestampMillis = value.timestampMillis;
                        const userId = value.userId;
                        const vendorId = value.vendorId;
                        const points = value.points * -1;
                        await models.VendorCustomer.findOneAndUpdate(
                            {
                                userId,
                                vendorId,
                            },
                            {
                                $inc: { totalPointsEarned: points, points },
                            }
                        );
                        updateInfoList.push({
                            utcTimestamp: timestampMillis,
                            uploaded: updatedExisting || upserted !== null,
                            error: null,
                        });
                    }
                }
                const filteredErrorLogs = checkInLogs.filter(el => {
                    return el.error != null;
                });
                return resolve(updateInfoList.concat(filteredErrorLogs));
            })
            .catch((errorCode: any) => {
                return reject(errorCode);
            });
    });
}

async function handleCustomerCheckInCancellation(
    userActivity: IUserActivityLog,
    resolve: () => void,
    reject: (e: any) => void
) {
    models.VendorCustomer.findOne({
        userId: userActivity.userId,
        vendorId: userActivity.vendorId,
    })
        .then(customer => {
            if (!customer) {
                return;
            }
            return resetCustomerPointsAndLogCheckInCancelledActivity(customer, userActivity);
        })
        .then(() => resolve())
        .catch(e => {
            return reject(e);
        });
}

async function resetCustomerPointsAndLogCheckInCancelledActivity(
    customer: IVendorCustomer,
    userActivity: IUserActivityLog
) {
    customer.points -= userActivity.points;
    customer.totalPointsEarned -= userActivity.points;

    let customerPointsModified = false;
    return customer
        .save()
        .then(() => {
            customerPointsModified = true;
            return logUserCheckInCancellationActivity(userActivity);
        })
        .catch(e => {
            if (customerPointsModified) {
                return models.VendorCustomer.updateOne(
                    { userId: userActivity.userId, vendorId: userActivity.vendorId },
                    {
                        $inc: {
                            points: userActivity.points,
                            totalPointsEarned: userActivity.points,
                        },
                    }
                ).then(() => {
                    throw e;
                });
            }
            throw e;
        });
}

async function handleRedeemableCancellation(
    userActivity: IUserActivityLog,
    resolve: () => void,
    reject: (e: any) => void
) {
    models.VendorCustomer.findOne({
        userId: userActivity.userId,
        vendorId: userActivity.vendorId,
    })
        .then(customer => {
            if (!customer) {
                return;
            }
            return resetRedeemableAndLogRedeemableCancelledActivity(customer, userActivity);
        })
        .then(() => resolve())
        .catch(e => {
            return reject(e);
        });
}

async function resetRedeemableAndLogRedeemableCancelledActivity(
    customer: IVendorCustomer,
    userActivity: IUserActivityLog
) {
    customer.points += userActivity.points;
    customer.totalPointsBurned -= userActivity.points;

    let customerPointsModified = false;
    let redeemableModified = false;
    return customer
        .save()
        .then(() => {
            customerPointsModified = true;
            return models.UserRedeemable.updateOne(
                { _id: userActivity.redeemableId },
                { $set: { redeemStatus: 'LOCKED' } }
            );
        })
        .then(() => {
            redeemableModified = true;
            return logRedeemableCancellationActivity(userActivity);
        })
        .catch(e => {
            if (redeemableModified) {
                return models.UserRedeemable.updateOne(
                    { _id: userActivity.redeemableId },
                    { $set: { redeemStatus: 'USED' } }
                )
                    .then(() => {
                        return models.VendorCustomer.updateOne(
                            { userId: userActivity.userId, vendorId: userActivity.vendorId },
                            {
                                $inc: {
                                    points: userActivity.points * -1,
                                    totalPointsBurned: userActivity.points,
                                },
                            }
                        );
                    })
                    .then(() => {
                        throw e;
                    });
            } else if (customerPointsModified) {
                return models.VendorCustomer.updateOne(
                    { userId: userActivity.userId, vendorId: userActivity.vendorId },
                    {
                        $inc: {
                            points: userActivity.points,
                            totalPointsEarned: userActivity.points,
                        },
                    }
                ).then(() => {
                    throw e;
                });
            }
            throw e;
        });
}

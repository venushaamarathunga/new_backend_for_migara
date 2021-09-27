import { MongoError } from 'mongodb';
import uuid from 'uuid';
import oauth2Model from '../auth/auth-model';
import logger from '../logger';
import models from '../models';
import { IIssuedUuid } from '../models/issued-uuid';
import { IUser } from '../models/user';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { InvalidUuidError } from './invalid-uuid-error';
import { NewUser } from './newUser';
import RegisteredUser from './RegisteredUser';
import { UserAlreadyExistsError } from './user-already-exists-error';

async function createUser(signupPayload: NewUser) {
    if (!signupPayload.mobileNumber || !signupPayload.name || !signupPayload.clientId) {
        throw new BadRequestError('Required parameters are missing');
    }

    if (signupPayload.mobileNumber.length !== 10 || !signupPayload.mobileNumber.startsWith('07')) {
        throw new BadRequestError('Invalid mobile number detected');
    }

    const client = await oauth2Model.getClient(signupPayload.clientId, null);
    if (client == null) {
        throw new BadRequestError('Invalid client credentials');
    }

    // todo: generate verif code and send through sms
    // todo: limit same uuid registration to specific shops

    let signupPromise;
    if (signupPayload.id) {
        logger.debug('Attempting to register new user as a mini card user');
        signupPromise = signupAsMiniCardUser(signupPayload);
    } else {
        logger.debug('Attempting to register new user as an app user');
        signupPromise = signupAsAppUser(signupPayload);
    }
    return signupPromise;
}

function getUserByMobileNumber(mobileNumber: string, deviceId: string) {
    return models.User.aggregate([
        {
            $match: { mobileNumber, deviceId }
        },
        {
            $lookup: {
                from: 'user-uuids',
                localField: '_id',
                foreignField: 'userId',
                as: 'usedUuid'
            }
        },
        {
            $unwind: '$usedUuid'
        },
        {
            $limit: 1
        }
    ]).then((results: any) => {
        if (!results || results.length === 0) {
            return null;
        }

        const user = results[0];
        return new RegisteredUser(
            user.usedUuid.accessType,
            user.mobileNumber,
            user.name,
            user.roles,
            user.usedUuid.uuid
        );
    });
}

function getUserByUuid(uuid: string) {
    return models.UserUUID.aggregate([
        {
            $match: { uuid }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: { path: '$userDetails' }
        },
        {
            $limit: 1
        }
    ]).then((results: any) => {
        if (!results || results.length === 0) {
            return null;
        }

        const user = results[0];
        return new RegisteredUser(
            user.accessType,
            user.userDetails.mobileNumber,
            user.userDetails.name,
            user.userDetails.roles,
            user.uuid
        );
    });
}

function signupAsMiniCardUser(payload: NewUser) {
    return new Promise((resolve, reject) => {
        models.IssuedUuid.findOne({ uuid: payload.id })
            .lean()
            .exec()
            .then(async issuedUuid => {
                if (issuedUuid == null || issuedUuid.usedIn !== 'card') {
                    logger.warn(
                        'Attempting to register a uuid used in app via card detected: ' +
                            JSON.stringify(payload)
                    );
                    reject(new InvalidUuidError());
                    return;
                }

                logger.info('Creating new user with role MINICARD_USER');
                const user: IUser = await models.User.findOneAndUpdate(
                    { mobileNumber: payload.mobileNumber, deviceId: 'default' },
                    {
                        $setOnInsert: {
                            deviceId: 'default',
                            mobileNumber: payload.mobileNumber,
                            name: payload.name,
                            roles: ['MINICARD_USER']
                        }
                    },
                    {
                        new: true,
                        upsert: true
                    }
                )
                    .lean()
                    .exec();

                return new models.UserUUID({
                    accessType: 'card',
                    userId: user._id,
                    uuid: payload.id
                }).save();
            })
            .then(() => resolve())
            .catch(error => {
                if (error instanceof MongoError && error.code === 11000) {
                    logger.warn(
                        'Attempting to register new user with an already registered uuid detected',
                        JSON.stringify(payload)
                    );
                    reject(new InvalidUuidError());
                    return;
                }
                reject(error);
            });
    });
}

function signupAsAppUser(payload: NewUser) {
    return new Promise(async (resolve, reject) => {
        const existingUser = await models.User.findOne({
            mobileNumber: payload.mobileNumber,
            deviceId: { $ne: 'default' }
        });
        if (existingUser) {
            reject(new UserAlreadyExistsError(payload.mobileNumber));
            return;
        }
        new models.IssuedUuid({
            uuid: uuid.v4(),
            usedIn: 'app'
        })
            .save()
            .then((issuedUuid: IIssuedUuid) => {
                const randomNumberString = Math.floor(Math.random() * 10000 + 1) + '';
                const entity = {
                    ...payload,
                    accessType: issuedUuid.usedIn,
                    uuid: issuedUuid.uuid,
                    verificationCode:
                        randomNumberString.length < 4
                            ? randomNumberString.padStart(4, '0')
                            : randomNumberString
                };
                entity.id = undefined;

                logger.info('Creating unverified user entry for user ' + payload.mobileNumber);
                return new models.UnverifiedUser(entity).save();
            })
            .then(() => {
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
}

export const userService = { createUser, getUserByMobileNumber, getUserByUuid };

import logger from '../logger';
import models from '../models';
import { User } from '../models/user';

function findUserByMobileNumber(mobileNumber: string) {
    return User.findOne({ mobileNumber, deviceId: { $ne: null } }).exec();
}

async function createUnverifiedUserEntry(
    mobileNumber: string,
    deviceId: string,
    challenge: string,
    accessType: string,
    uuid?: string,
    name?: string
) {
    const randomNumberString = Math.floor(Math.random() * 10000 + 1) + '';

    const unverifiedUser = await models.UnverifiedUser.findOneAndUpdate(
        { mobileNumber },
        {
            $set: {
                mobileNumber,
                deviceId,
                challenge,
                accessType,
                uuid,
                name,
                createdDate: new Date().toISOString(),
                tryCount: 0,
                verificationCode:
                    randomNumberString.length < 4
                        ? randomNumberString.padStart(4, '0')
                        : randomNumberString,
            },
        },
        {
            new: true,
            upsert: true,
        }
    );
    logger.info(`Unverified user created with this verification code ${randomNumberString}`, {
        label: 'user-repository',
    });
    return unverifiedUser;
}

const userRepo = {
    findUserByMobileNumber,
    createUnverifiedUserEntry,
};
export default userRepo;

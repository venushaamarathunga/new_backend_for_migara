import { createHash } from 'crypto';
import express from 'express';
import { MongoError } from 'mongodb';
import logger from '../logger';
import models from '../models';
import { IUnverifiedUser } from '../models/unverified-user';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { InvalidUuidError } from './invalid-uuid-error';
import { NewUser } from './NewUser';
import { userService } from './user.service';
import oauth2Model from '../auth/auth-model';

const router = express.Router();

router.post(
    '/signup',
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const signupPayload: NewUser = req.body;
        userService
            .createUser(signupPayload)
            .then(() => {
                logger.info('New user created: ' + signupPayload.mobileNumber);
                res.status(200).send();
            })
            .catch(error => {
                logger.error('New user creation failed: ', JSON.stringify(signupPayload));
                next(error);
            });
        // oauth2Server
        //     .token({
        //         accessTokenLifetime: process.env.NODE_ENV === 'development' ? 86400 : 3600,
        //         requireClientAuthentication: {
        //             password: false
        //         }
        //     })(req, res, next)
        //     .then((token: OAuth2Server.Token) => {
        //         res.json(token);
        //     })
        //     .catch((err: any) => {
        //         res.status(err.code || 500).json(err);
        //     });
    }
);

router.post('/user/verify', async (req, res, next) => {
    const verifyPayload: ToBeVerifiedUser = req.body;

    const client = await oauth2Model.getClient(verifyPayload.clientId, null);
    if (client == null) {
        next(new BadRequestError('Invalid client credentials'));
        return;
    }

    const unverifiedUsers: IUnverifiedUser[] = await models.UnverifiedUser.find({
        mobileNumber: verifyPayload.mobileNumber,
        verificationCode: verifyPayload.code
    });

    let verifiedUser: IUnverifiedUser = null;
    for (let i = 0, len = unverifiedUsers.length; i < len; i++) {
        const hashedVerifier = createHash('sha256')
            .update(verifyPayload.verifier)
            .digest('hex');
        if (unverifiedUsers[i].challenge === hashedVerifier) {
            verifiedUser = unverifiedUsers[i];
            break;
        }
    }
    if (verifiedUser) {
        const user = await new models.User({
            deviceId: verifiedUser.deviceId,
            mobileNumber: verifiedUser.mobileNumber,
            name: verifiedUser.name,
            roles: ['APP_USER']
        }).save();

        new models.UserUUID({
            accessType: verifiedUser.accessType,
            userId: user._id,
            uuid: verifiedUser.uuid
        })
            .save()
            .then(() => {
                logger.info('User created with role APP_USER');
                models.UnverifiedUser.deleteMany({
                    mobileNumber: verifiedUser.mobileNumber
                }).catch(error => {
                    logger.error(
                        'Error while deleting unverified user entries for mobile number: ' +
                            verifiedUser.mobileNumber,
                        error
                    );
                });
                res.status(200).send();
            })
            .catch(error => {
                if (error instanceof MongoError && error.code === 11000) {
                    logger.warn(
                        'Attempting to verify new user with an already registered uuid detected',
                        JSON.stringify(verifiedUser)
                    );
                    next(new InvalidUuidError());
                    return;
                }
                next(error);
            });
    } else {
        next(new BadRequestError('Invalid verification details provided'));
    }
});

const unAuthorizedUserRouter = router;
export default unAuthorizedUserRouter;

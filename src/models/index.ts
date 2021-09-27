import { connect, connection } from 'mongoose';
import IssuedUuid from './issued-uuid';
import OAuthAuthorizationCode from './oauth-authorization-code';
import OAuthClient from './oauth-client';
import OAuthPublicClientAuthorizationCode from './oauth-public-client-authorization-code';
import OAuthToken from './oauth-token';
import UnverifiedUser from './unverified-user';
import User from './user';
import UserUUID from './user-uuid';
import PromotionCampaign from './promotion-campaign';

const connectDb = () => {
    return new Promise<void>((resolve, reject) => {
        connect(
            `mongodb://${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
            {
                autoIndex: process.env.NODE_ENV === 'production' ? false : true,
                useCreateIndex: true,
                useFindAndModify: false,
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        )
            .then(async conn => {
                // await saveNewUser();
                resolve();
            })
            .catch(err => {
                reject(err);
            });
        connection.on('disconnected', connectDb);
    });
};

function saveNewUser() {
    return new Promise<void>((resolve, reject) => {
        const user = new models.User({
            email: 'test@example.com',
            firstName: 'ioowei',
            lastName: '00rer'
        });
        user.save((err, result) => {
            if (err) {
                console.error(err);
                reject();
                return;
            }
            console.log(result);
            resolve();
        });
    });
}

const models = {
    IssuedUuid,
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthPublicClientAuthorizationCode,
    OAuthToken,
    UnverifiedUser,
    User,
    UserUUID,
    PromotionCampaign
};

export const db: AppDB = { connect: connectDb };

export default models;

export interface AppDB {
    connect: () => Promise<void>;
}

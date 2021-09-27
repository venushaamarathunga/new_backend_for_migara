import { createHash } from 'crypto';
import { sign, verify } from 'jsonwebtoken';
import OAuth2Server = require('oauth2-server');
import logger from '../logger';
import models from '../models';
import { IOAuthClient } from '../models/oauth-client';
import { userService } from '../user/user.service';

const oauth2Model: OAuth2Server.AuthorizationCodeModel | OAuth2Server.PasswordModel = {
    generateAccessToken: async (
        client: OAuth2Server.Client,
        user: OAuth2Server.User,
        scope: string
    ): Promise<string> => {
        const jwtKey = process.env.JWT_SIGNING_KEY;
        if (!jwtKey) {
            throw new OAuth2Server.ServerError('Cannot create jwt');
        }

        return sign(
            {
                client: {
                    grants: client.grants,
                    id: client.id
                },
                userId: user.uuid
            },
            jwtKey,
            {
                expiresIn: 86400, // seconds in a day
                issuer: 'flava'
            }
        );
    },
    generateRefreshToken: async (
        client: OAuth2Server.Client,
        user: OAuth2Server.User,
        scope: string | string[]
    ): Promise<string> => {
        return sign(
            {
                client: {
                    grants: client.grants,
                    id: client.id
                },
                userId: user.uuid
            },
            process.env.JWT_SIGNING_KEY,
            {
                expiresIn: 604800, // seconds in a week
                issuer: 'flava'
            }
        );
    },
    getClient: async (
        clientId: string,
        clientSecret: string
    ): Promise<OAuth2Server.Client | OAuth2Server.Falsey> => {
        return new Promise(resolve => {
            models.OAuthClient.findOne({ clientId })
                .exec()
                .then(client => {
                    if (!client) {
                        return resolve();
                    }

                    if (!clientSecret) {
                        return resolve(getClientDetails(client));
                    }

                    if (!client.isPublic && client.clientSecret !== clientSecret) {
                        resolve(null);
                        return;
                    }

                    if (client.isPublic && client.tempClientSecret) {
                        if (client.tempClientSecret.clientSecret !== clientSecret) {
                            return resolve(null);
                        }
                        if (client.tempClientSecret.expiresAt < new Date()) {
                            return resolve(null);
                        }
                    }

                    return resolve(getClientDetails(client));
                });
        });
    },
    saveToken: async (
        token: OAuth2Server.Token,
        client: OAuth2Server.Client,
        user: OAuth2Server.User
    ): Promise<OAuth2Server.Token> => {
        return {
            ...token,
            client,
            user
        };
    },
    // Authorization header validation
    getAccessToken: async (accessToken: string): Promise<OAuth2Server.Token> => {
        return new Promise(resolve => {
            verify(
                accessToken,
                process.env.JWT_SIGNING_KEY,
                { issuer: 'flava' },
                (err, decoded: any) => {
                    if (err) {
                        logger.warn('JWT Verification failed: ' + JSON.stringify(err));
                        return resolve(null);
                    }

                    const expiry = new Date();
                    expiry.setSeconds(decoded.exp);
                    return resolve({
                        accessToken,
                        accessTokenExpiresAt: expiry,
                        client: decoded.client,
                        user: {
                            id: decoded.userId
                        }
                    });
                }
            );
        });
    },
    verifyScope: async (token: OAuth2Server.Token, scope: string): Promise<boolean> => {
        return true;
    },

    // validateScope: async (
    // user: User,
    // client: Client,
    // scope: string | string[]): Promise<string | string[] | OAuth2Server.Falsey> => {
    //     return scope;
    // }

    // authorization code flow -- start
    // generateAuthorizationCode: async (client, user, scope) => {
    //     // return Promise.resolve('someauthcode');
    //     return 'sdfasdfs';
    // },
    getAuthorizationCode: async (
        authorizationCode: string
    ): Promise<OAuth2Server.AuthorizationCode> => {
        let verificationCode: string = null;
        if (authorizationCode.indexOf('#verif#') > 0) {
            const array = authorizationCode.split('#verif#');
            authorizationCode = array[0];
            verificationCode = array[1];
        }
        return models.OAuthAuthorizationCode.findOne({ authorizationCode })
            .exec()
            .then(authCode => {
                if (authCode == null) {
                    return null;
                }

                if (verificationCode) {
                    const hashedVerifier = createHash('sha256')
                        .update(verificationCode)
                        .digest('hex');
                    if ((authCode.user as any).codeChallenge !== hashedVerifier) {
                        throw new OAuth2Server.InvalidGrantError(
                            'Invalid grant: verification failed'
                        );
                    }
                }

                return authCode as OAuth2Server.AuthorizationCode;
            });
    },
    saveAuthorizationCode: async (
        code,
        client: OAuth2Server.Client,
        user: OAuth2Server.User
    ): Promise<OAuth2Server.AuthorizationCode> => {
        const entity = {
            ...code,
            client,
            user
        };
        return new models.OAuthAuthorizationCode(entity).save() as Promise<
            OAuth2Server.AuthorizationCode
        >;
    },
    revokeAuthorizationCode: async (code: OAuth2Server.AuthorizationCode): Promise<boolean> => {
        return true;
    },
    // authorization code flow -- end

    // password flow -- start
    getUser: async (
        username: string,
        password: string
    ): Promise<OAuth2Server.User | OAuth2Server.Falsey> => {
        if (username.startsWith('07') && username.length === 10) {
            // signing in with mobile number
            return userService.getUserByMobileNumber(username, password);
        }

        return userService.getUserByUuid(username);
    }
    // password flow -- end
};

function getClientDetails(client: IOAuthClient) {
    return {
        accessTokenLifetime: client.accessTokenLifetime,
        grants: client.grants,
        id: client.clientId,
        redirectUris: client.isPublic ? ['http://localhost'] : client.redirectUris
    };
}

export default oauth2Model;

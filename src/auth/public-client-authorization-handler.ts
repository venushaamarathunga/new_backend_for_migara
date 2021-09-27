import { createHash } from 'crypto';
import express from 'express';
import OAuth2Server, {
    InvalidClientError,
    InvalidGrantError,
    InvalidRequestError,
    OAuthError,
    Request,
    Response,
    UnauthorizedClientError,
    UnauthorizedRequestError
} from 'oauth2-server';
import oauth2Server, { oauthServerOptions } from '.';
import models from '../models';
import { userService } from '../user/user.service';
import oauth2Model from './auth-model';
import TokenUtils from './TokenUtils';

export default class PublicClientAuthorizationHandler {
    private readonly authorizationCodeLifetime = 5 * 60; // 5 minutes

    /**
     * Issues an authorization code for a public client for it to obtain a temporary client secret
     * @param req request
     * @param res response
     * @param next next handler
     */
    public authorizeForClientSecret(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        return this.getClient(req)
            .then(client => {
                const expiresAt = this.getAuthorizationCodeLifetime();
                const scope = req.body.scope || req.query.scope;
                const challenge = req.body.challenge;
                const authorizationCode = TokenUtils.generateRandomToken();

                if (!challenge) {
                    throw new InvalidGrantError('Missing parameter: `challenge`');
                }

                return models.OAuthPublicClientAuthorizationCode.findOneAndUpdate(
                    { authorizationCode },
                    {
                        $set: {
                            authorizationCode,
                            challenge,
                            client,
                            expiresAt,
                            scope
                        }
                    },
                    {
                        new: true,
                        upsert: true
                    }
                );
            })
            .then(code => {
                res.locals.oauth = { code };
                return res.send({
                    code: code.authorizationCode,
                    expiresAt: code.expiresAt
                });
            })
            .catch(e => {
                this.handleError(e, res, next);
            });
    }

    /**
     * Exchanges a client secret for an authorization token issued to a client.
     * Expiry of the client secret will be the same as the authorization code.
     *
     * @param req request
     * @param res response
     * @param next next handler
     */
    public issueClientSecret(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        return new Promise(resolve => {
            const clientSecretRequest: {
                client_id: string;
                grant_type: string;
                code: string;
                verifier: string;
            } = req.body;

            if (!clientSecretRequest.client_id) {
                throw new InvalidRequestError('Missing parameter: `client_id`');
            }

            if (!clientSecretRequest.verifier) {
                throw new InvalidRequestError('Missing parameter: `verifier`');
            }

            if (clientSecretRequest.grant_type !== 'authorization_code') {
                throw new InvalidRequestError('grant_type should be `authorization_code`');
            }

            return models.OAuthPublicClientAuthorizationCode.findOne({
                authorizationCode: clientSecretRequest.code
            })
                .lean()
                .exec()
                .then(publicAuthCode => {
                    if (!publicAuthCode) {
                        throw new InvalidGrantError('Invalid grant: authorization code is invalid');
                    }

                    if (publicAuthCode.client.id !== clientSecretRequest.client_id) {
                        throw new InvalidGrantError('Invalid grant: authorization code is invalid');
                    }

                    if (publicAuthCode.expiresAt < new Date()) {
                        throw new InvalidGrantError(
                            'Invalid grant: authorization code has expired'
                        );
                    }

                    const hashedVerifier = createHash('sha256')
                        .update(clientSecretRequest.verifier)
                        .digest('hex');
                    if (publicAuthCode.challenge !== hashedVerifier) {
                        throw new InvalidGrantError('Invalid grant: verification failed');
                    }

                    return models.OAuthClient.findOne({
                        clientId: clientSecretRequest.client_id
                    }).then(client => {
                        client.tempClientSecret = {
                            expiresAt: publicAuthCode.expiresAt,
                            clientSecret: Math.random()
                                .toString(36)
                                .slice(2)
                        };
                        return client.save();
                    });
                })
                .then(client => {
                    res.send(client.tempClientSecret);
                    return resolve();
                })
                .catch(error => {
                    this.handleError(error, res, next);
                });
        }).catch(e => {
            this.handleError(e, res, next);
        });
    }

    /**
     * Authorizes a public client using PKCE.
     * Authorization code request must contain a challenge parameter which needs to be provided when requesting
     * the token using the authorization code granted in thie step.
     * @param req request
     * @param res response
     * @param next next function
     */
    public authorizeWithPKCE(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        return new Promise(resolve => {
            const request = new Request(req);
            const response = new Response(res);

            const payload = req.body;

            if (!payload.challenge) {
                throw new InvalidGrantError('Missing parameter: `challenge`');
            }

            if (!payload.mobile_number) {
                throw new InvalidClientError('Missing parameter: `mobile_number`');
            }

            if (!payload.device_id) {
                throw new InvalidClientError('Missing parameter: `device_id`');
            }

            oauth2Server.server
                .authorize(request, response, {
                    allowEmptyState: true,
                    authenticateHandler: {
                        handle: () => {
                            return userService
                                .getUserByMobileNumber(payload.mobile_number, payload.device_id)
                                .then(profile => {
                                    if (!profile) {
                                        return null;
                                    }

                                    (profile as any).codeChallenge = payload.challenge;
                                    return profile;
                                });
                        }
                    },
                    authorizationCodeLifetime: this.authorizationCodeLifetime
                })
                .then((code: OAuth2Server.AuthorizationCode) => {
                    res.locals.oauth = { code };
                    if (oauthServerOptions.continueMiddleware) {
                        next();
                    }

                    // res.set(response.headers);
                    res.send({
                        authorizationCode: code.authorizationCode,
                        expiresAt: code.expiresAt
                    });
                    return resolve();
                })
                .catch((e: any) => {
                    this.handleError(e, res, next, response);
                });
        }).catch((e: any) => {
            this.handleError(e, res, next);
        });
    }

    /**
     * Get authorization code lifetime.
     */
    private getAuthorizationCodeLifetime() {
        const expires = new Date();

        expires.setSeconds(expires.getSeconds() + this.authorizationCodeLifetime);
        return expires;
    }

    /**
     * Get the client from the model.
     */
    private getClient(request: express.Request) {
        const clientId = request.body.client_id || request.query.client_id;

        return new Promise((resolve, reject) => {
            if (!clientId) {
                throw new InvalidRequestError('Missing parameter: `client_id`');
            }

            return oauth2Model
                .getClient(clientId, null)
                .then(client => {
                    if (!client) {
                        throw new InvalidClientError(
                            'Invalid client: client credentials are invalid'
                        );
                    }

                    if (!client.grants) {
                        throw new InvalidClientError('Invalid client: missing client `grants`');
                    }

                    if (!client.grants.includes('authorization_code')) {
                        throw new UnauthorizedClientError(
                            'Unauthorized client: `grant_type` is invalid'
                        );
                    }

                    return resolve(client);
                })
                .catch(error => {
                    return reject(error);
                });
        });
    }

    private handleError(
        e: any,
        res: express.Response,
        next: express.NextFunction,
        authResp?: Response
    ) {
        if (oauthServerOptions.useErrorHandler === true) {
            return next(e);
        }

        if (!(e instanceof OAuthError)) {
            return next(e);
        }

        if (authResp) {
            res.set(authResp.headers);
        }
        res.status(e.code);

        if (e instanceof UnauthorizedRequestError) {
            return res.send();
        }

        res.send({ error: e.name, error_description: e.message });
    }
}

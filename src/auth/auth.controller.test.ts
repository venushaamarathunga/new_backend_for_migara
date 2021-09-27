import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import supertest from 'supertest';
import app from '../app';
import logger from '../logger';
import models, { db } from '../models';
import { OAuthClient } from '../models/oauth-client';
import { User } from '../models/user';

describe('Auth Controller', () => {
    dotenv.config({ path: '.env.test' });
    let server: Server;
    let user;

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        // tslint:disable-next-line: no-shadowed-variable
        server = await app().then(app => {
            return createServer(app).listen(0, () => {
                logger.info(`App is running http on port`);
            });
        });

        user = await new User({
            deviceId: 'jklmn',
            mobileNumber: '0712222222',
            name: 'Sunil Perera',
            roles: ['APP_USER'],
            uuid: '21883f34-b76c-41ac-8dbf-97d71d299a4c',
        }).save();
    });

    it('should grant authorization code to a valid app user on /authorize/mobile', async done => {
        await new OAuthClient(mockPublicClient()).save();

        const result = await supertest(server)
            .post('/auth/authorize/mobile')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                client_id: 'client1',
                response_type: 'code',
                mobile_number: '0712222222',
                device_id: 'jklmn',
            });

        expect(result.status).toBe(200);
        expect(result.body.authorizationCode).toBeDefined();
        done();
    });

    it('should return access token after verifying authorization code from a public client on /auth/token', async done => {
        await new models.OAuthAuthorizationCode({
            authorizationCode: 'authcode',
            client: {
                id: 'client1',
            },
            expiresAt: new Date().setFullYear(3000),
            user: {
                uuid: '21883f34-b76c-41ac-8dbf-97d71d299a4c',
                codeChallenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            },
        }).save();
        await new OAuthClient(mockPublicClient()).save();

        const result = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client1',
                grant_type: 'authorization_code',
                code: 'authcode',
            });

        expect(result.status).toBe(200);
        expect(result.body.access_token).toBeDefined();
        expect(result.body.refresh_token).toBeDefined();
        expect(result.body.expires_in).toBeGreaterThan(0);
        expect(result.body.token_type).toEqual('Bearer');
        done();
    });

    it('integration: should return access token for the received app authorization code from /auth/authorize/mobile on /auth/token', async done => {
        await new OAuthClient(mockPublicClient()).save();

        const codeResult = await supertest(server)
            .post('/auth/authorize/mobile')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                client_id: 'client1',
                response_type: 'code',
                mobile_number: '0712222222',
                device_id: 'jklmn',
            });
        const tokenResult = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client1',
                grant_type: 'authorization_code',
                code: codeResult.body.authorizationCode,
            });

        expect(tokenResult.status).toBe(200);
        expect(tokenResult.body.access_token).toBeDefined();
        done();
    });

    it('should grant authorization code to a valid terminal on /authorize/terminal', async done => {
        await new OAuthClient(mockTerminalClient()).save();

        const result = await supertest(server)
            .post('/auth/authorize/terminal')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                client_id: 'client_terminal',
            });

        expect(result.status).toBe(200);
        expect(result.body.code).toBeDefined();
        done();
    });

    it('should return access token after verifying authorization code from a terminal client on /auth/token', async done => {
        await new models.OAuthAuthorizationCode({
            authorizationCode: 'authcode',
            client: {
                id: 'client_terminal',
            },
            expiresAt: new Date().setFullYear(3000),
            user: {
                id: 'client_terminal',
                codeChallenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            },
        }).save();
        await new OAuthClient(mockTerminalClient()).save();

        const result = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client_terminal',
                grant_type: 'authorization_code',
                code: 'authcode',
            });

        expect(result.status).toBe(200);
        expect(result.body.access_token).toBeDefined();
        expect(result.body.refresh_token).toBeDefined();
        expect(result.body.expires_in).toBeGreaterThan(0);
        expect(result.body.token_type).toEqual('Bearer');
        done();
    });

    it('integration: should return access token for the received terminal authorization code from /auth/authorize/terminal on /auth/token', async done => {
        await new OAuthClient(mockTerminalClient()).save();

        const codeResult = await supertest(server)
            .post('/auth/authorize/terminal')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                client_id: 'client_terminal',
            });
        const tokenResult = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client_terminal',
                grant_type: 'client_credentials',
                code: codeResult.body.code,
            });

        expect(tokenResult.status).toBe(200);
        expect(tokenResult.body.access_token).toBeDefined();
        done();
    });

    it('integration: should return access token after verifying refresh token on /auth/token', async done => {
        await new models.OAuthAuthorizationCode({
            authorizationCode: 'authcode',
            client: {
                id: 'client_terminal',
            },
            expiresAt: new Date().setFullYear(3000),
            user: {
                id: 'client_terminal',
                codeChallenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            },
        }).save();
        await new OAuthClient(mockTerminalClient()).save();

        const accessTokenResult = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client_terminal',
                grant_type: 'authorization_code',
                code: 'authcode',
            });
        const refreshTokenResult = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                client_id: 'client_terminal',
                grant_type: 'refresh_token',
                refresh_token: accessTokenResult.body.refresh_token,
            });

        expect(refreshTokenResult.status).toBe(200);
        expect(refreshTokenResult.body.access_token).toBeDefined();
        expect(refreshTokenResult.body.refresh_token).toBeDefined();
        expect(refreshTokenResult.body.expires_in).toBeGreaterThan(0);
        expect(refreshTokenResult.body.token_type).toEqual('Bearer');
        done();
    });

    it('integration: should return error if access token was requested for the same app authorization code twice on /auth/token', async done => {
        await new OAuthClient(mockPublicClient()).save();

        const codeResult = await supertest(server)
            .post('/auth/authorize/terminal')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                client_id: 'client_terminal',
            });
        const tokenResult = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client1',
                grant_type: 'authorization_code',
                code: codeResult.body.code,
            });
        const tokenResult2 = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                verifier: 'abc',
                client_id: 'client1',
                grant_type: 'authorization_code',
                code: codeResult.body.code,
            });

        expect(tokenResult2.status).toBe(400);
        done();
    });

    it('should return access token after verifying credentials of portal user on /auth/token', async done => {
        await new OAuthClient(mockPortalClient()).save();
        const portalUser = await new User({
            username: 'kamal',
            password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
            roles: ['PORTAL_USER'],
            name: 'Kamal Perera',
            deviceId: '###',
            mobileNumber: '###',
            uuid: 'e0f76a44-336c-4aa1-b5ec-1c80fef97f08',
        }).save();

        const result = await supertest(server)
            .post('/auth/token')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({
                client_id: 'flava-portal',
                client_secret: 'secret',
                grant_type: 'password',
                username: 'kamal',
                password: '1234',
            });

        expect(result.status).toBe(200);
        expect(result.body.access_token).toBeDefined();
        expect(result.body.refresh_token).toBeDefined();
        expect(result.body.expires_in).toBeGreaterThan(0);
        expect(result.body.token_type).toEqual('Bearer');
        done();
    });

    afterEach(async () => {
        server.close();
    });

    function mockPublicClient() {
        return {
            clientId: 'client1',
            grants: ['authorization_code'],
            isPublic: true,
        };
    }

    function mockTerminalClient() {
        return {
            clientId: 'client_terminal',
            grants: ['authorization_code', 'client_credentials', 'refresh_token'],
            isPublic: true,
            redirectUris: ['redirecturl'],
        };
    }

    function mockPortalClient() {
        return {
            clientId: 'flava-portal',
            clientSecret: 'secret',
            grants: ['password', 'refresh_token'],
        };
    }
});

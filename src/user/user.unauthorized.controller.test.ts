import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import supertest from 'supertest';
import app from '../app';
import logger from '../logger';
import models, { db } from '../models';
import { OAuthClient } from '../models/oauth-client';
import { User } from '../models/user';
import { HashUtil } from '../utils/HashUtil';
import * as userService from './user.service';

describe('Unauthorized User Controller', () => {
    dotenv.config({ path: '.env.test' });
    let server: Server;

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        // tslint:disable-next-line: no-shadowed-variable
        server = await app().then(app => {
            return createServer(app).listen(0, () => {
                logger.info(`App is running http on port`);
            });
        });
    });

    it('should return 200 status if user create was success', done => {
        jest.spyOn(userService, 'createUser').mockImplementation(() => Promise.resolve());

        supertest(server)
            .post('/signup/')
            .expect(200);
        done();
    }, 10000);

    it('should create a new user entry after verifying for entries with a uuid', async () => {
        await new OAuthClient(mockClient()).save();
        await new models.UnverifiedUser({
            mobileNumber: '0712222222',
            deviceId: 'abcdef',
            challenge: HashUtil.createHexEncodedSha256Hash('verif'),
            verificationCode: '9999',
            accessType: 'app',
            createdDate: new Date().toISOString(),
            uuid: '4e7ac433-4b81-4636-8ce8-19274a080b5d',
            name: 'Nimal Perera',
        }).save();

        expect(await User.findOne({ mobileNumber: '0712222222' })).toBeNull();

        await supertest(server)
            .post('/user/verify')
            .send({
                verifier: 'verif',
                clientId: 'client1',
                code: '9999',
                mobileNumber: '0712222222',
            });

        const user = await User.findOne({ uuid: '4e7ac433-4b81-4636-8ce8-19274a080b5d' });
        expect(user.name).toEqual('Nimal Perera');
        expect(user.mobileNumber).toEqual('0712222222');
        expect(user.deviceId).toEqual('abcdef');
        expect(Array.from(user.roles)).toEqual(['APP_USER']);
    });

    it('should update the existing user entry after verifying for entries without a uuid', async done => {
        await new OAuthClient(mockClient()).save();
        await new models.UnverifiedUser({
            mobileNumber: '0712222222',
            deviceId: 'abcdef',
            challenge: HashUtil.createHexEncodedSha256Hash('verif'),
            verificationCode: '9999',
            createdDate: new Date().toISOString(),
            accessType: 'app',
            name: 'Another name',
        }).save();
        await new User({
            deviceId: 'jklmn',
            mobileNumber: '0712222222',
            name: 'Sunil Perera',
            roles: ['APP_USER'],
            uuid: '4e7ac433-4b81-4636-8ce8-19274a080b5d',
        }).save();

        await supertest(server)
            .post('/user/verify')
            .send({
                verifier: 'verif',
                clientId: 'client1',
                code: '9999',
                mobileNumber: '0712222222',
            });

        const saved = await User.find({ mobileNumber: '0712222222' });
        expect(saved.length).toEqual(1);
        expect(saved[0].deviceId).toEqual('abcdef');
        expect(saved[0].name).toEqual('Sunil Perera');
        done();
    }, 20000);

    afterEach(async () => {
        server.close();
    });

    function mockClient() {
        return {
            clientId: 'client1',
        };
    }
});

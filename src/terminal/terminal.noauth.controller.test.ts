import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import { Types } from 'mongoose';
import supertest from 'supertest';
import app from '../app';
import logger from '../logger';
import { db } from '../models';
import { VendorAuthClient } from '../models/vendor-auth-client';

describe('Promotion Controller', () => {
    dotenv.config({ path: '.env.test' });
    let server: Server;

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        server = await app().then(app => {
            return createServer(app).listen(0, () => {
                logger.info(`App is running http on port`);
            });
        });
    });

    it('Should return error response if vendor card was used on another device', async done => {
        const terminal = await new VendorAuthClient({
            vendorId: new Types.ObjectId(),
            cardUuid: '74bd416f-8744-46fa-9a20-991b0d3d4511',
            deviceId: 'abc',
            clientId: 'abcdefgh',
        }).save();

        const res = await supertest(server)
            .post('/terminals/abcdefgh')
            .send({
                cardId: '74bd416f-8744-46fa-9a20-991b0d3d4511',
                deviceId: 'xyz',
            });

        expect(res.status).toEqual(403);
        expect(res.body.message).toMatch('Your card is not allowed to be used in this terminal');
        done();
    }, 10000);
});

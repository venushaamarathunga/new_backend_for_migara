import dotenv from 'dotenv';
import { Router } from 'express';
import supertest from 'supertest';
import { generateJWTToken } from '../auth/auth-model';
import { db } from '../models';
import app from './../app';
import * as redeemableService from './redeemable.service';

describe('Promotion Controller', () => {
    dotenv.config({ path: '.env.test' });
    let router: Router;
    const jwtKey = process.env.JWT_SIGNING_KEY;
    const client = {
        grants: 'password',
        id: '5de60cfa7ecd5c7f3754ab16',
    };
    const user = { uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd' };

    const randomToken: string = 'Bearer ' + generateJWTToken(client, jwtKey, user);
    const portalUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['PORTAL_USER'] });

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    it('should allow user with role:vendor scope to create redeemable', async () => {
        const spy = jest
            .spyOn(redeemableService, 'createRedeemableForVendor')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/redeemables')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to create redeemable', async () => {
        const spy = jest
            .spyOn(redeemableService, 'createRedeemableForVendor')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/redeemables')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });
});

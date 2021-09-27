import dotenv from 'dotenv';
import { Router } from 'express';
import supertest from 'supertest';
import { generateJWTToken } from '../auth/auth-model';
import { db } from '../models';
import app from './../app';
import { userPromotionService } from './user-promotion.service';
import * as redeemableService from './user-redeemable.service';
import * as userService from './user.service';

describe('User Controller', () => {
    dotenv.config({ path: '.env.test' });
    let router: Router;
    const jwtKey = process.env.JWT_SIGNING_KEY;
    const client = {
        grants: ['password'],
        id: '5de60cfa7ecd5c7f3754ab16',
    };
    const user = { uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd' };

    const randomUserToken: string = 'Bearer ' + generateJWTToken(client, jwtKey, user);
    const adminUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['ADMIN'] });
    const appUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['APP_USER'] });

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    it('should allow user with scope role:consumer to get user profile', async () => {
        const spy = jest.spyOn(userService, 'getUserProfile').mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow user with scope role:admin to get user profile', async () => {
        const spy = jest.spyOn(userService, 'getUserProfile').mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:admin or role:consumer scope to get user profile', async () => {
        const spy = jest.spyOn(userService, 'getUserProfile').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/users/123')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to change redeemable status of a redeemable', async () => {
        const spy = jest
            .spyOn(redeemableService, 'changeRedeemStatus')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .patch('/users/123/redeemables/456/status')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:consumer scope to change redeemable status of a redeemable', async () => {
        const spy = jest
            .spyOn(redeemableService, 'changeRedeemStatus')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .patch('/users/123/redeemables/456/status')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to get customer status of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getUserRegisteredVendor')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow user with scope role:admin to get customer status of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getUserRegisteredVendor')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:admin or role:consumer scope to get customer status of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getUserRegisteredVendor')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/users/123/vendors/456')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to get redeemables of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getVendorRedeemable')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456/redeemables')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow user with scope role:admin to get redeemables of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getVendorRedeemable')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456/redeemables')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:admin or role:consumer scope to get redeemables of a user at a vendor', async () => {
        const spy = jest
            .spyOn(redeemableService, 'getVendorRedeemable')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/users/123/vendors/456/redeemables')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to get promotions of a user at a vendor', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getVendorPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456/promotions')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow user with scope role:admin to get promotions of a user at a vendor', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getVendorPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/vendors/456/promotions')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:admin or role:consumer scope to get promotions of a user at a vendor', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getVendorPromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/users/123/vendors/456/promotions')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to get promotions of a user', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getUserPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/promotions')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow user with scope role:admin to get promotions of a user', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getUserPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/users/123/promotions')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:admin or role:consumer scope to get promotions of a user', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'getUserPromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/users/123/promotions')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to check in', async () => {
        const spy = jest.spyOn(userService, 'checkInUser').mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/users/123/check-in')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:consumer scope to check in', async () => {
        const spy = jest.spyOn(userService, 'checkInUser').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/users/123/check-in')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to update promotion view count', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'updatePromotionViewCount')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .patch('/users/123/promotions/456/view-count')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:consumer scope to update promotion view count', async () => {
        const spy = jest
            .spyOn(userPromotionService, 'updatePromotionViewCount')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .patch('/users/123/promotions/456/view-count')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to update fcm token', async () => {
        const spy = jest
            .spyOn(userService, 'syncAndgetUserProfile')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/users/123/sync')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:consumer scope to update fcm token', async () => {
        const spy = jest
            .spyOn(userService, 'syncAndgetUserProfile')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/users/123/sync')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with scope role:consumer to update NIC', async () => {
        const spy = jest.spyOn(userService, 'updateUserNic').mockResolvedValueOnce({} as any);

        await supertest(router)
            .patch('/users/123/nic')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user without role:consumer scope to update NIC', async () => {
        const spy = jest.spyOn(userService, 'updateUserNic').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .patch('/users/123/nic')
            .set('Authorization', randomUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });
});

import dotenv from 'dotenv';
import { Router } from 'express';
import request from 'supertest';
import supertest from 'supertest';
import { generateJWTToken } from '../auth/auth-model';
import { db } from '../models';
import { IPromotionCampaign } from '../models/promotion-campaign';
import { FlavaVendorManager } from '../vendor/FlavaVendorManager';
import app from './../app';
import * as promotionService from './promotion.service';

describe('Promotion Controller', () => {
    dotenv.config({ path: '.env.test' });
    let router: Router;
    const expiresAt: Date = new Date(2020, 12, 19);
    const scheduledDate: Date = new Date();
    const jwtKey = process.env.JWT_SIGNING_KEY;
    const client = {
        grants: 'password',
        id: '5de60cfa7ecd5c7f3754ab16',
    };
    const user = { uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd' };

    const randomToken: string = 'Bearer ' + generateJWTToken(client, jwtKey, user);
    const portalUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['PORTAL_USER'] });

    const promotion = {
        title: 'test title',
        thumbnailImageUrl: '.thrgwegwedfgtyfffsdgddfgmageUrl',
        imageUrls: ['nwjsfvksjvlsmvlfufsml'],
        description: '.fdbfyufd',
        expiresAt,
        scheduledDate,
        targetAllFlavaCustomers: true,
    };

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    it('should allow user with role:vendor scope to create promotion', async () => {
        const spy = jest
            .spyOn(promotionService, 'createPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/promotions')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to create promotion', async () => {
        const spy = jest
            .spyOn(promotionService, 'createPromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/promotions')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('Should create a promotion and get 202 statuscode', async done => {
        jest.spyOn(promotionService, 'createPromotion').mockResolvedValueOnce(
            promotion as IPromotionCampaign
        );

        const res = await request(router)
            .post('/promotions')
            .set('Authorization', portalUserToken)
            .send(promotion);

        expect(res.status).toEqual(202);
        expect(res.body.title).toMatch(promotion.title);
        expect(res.body.description).toMatch(promotion.description);
        done();
    });

    it('should allow user with role:vendor scope to get promotions', async () => {
        const spy = jest
            .spyOn(promotionService, 'getVendorPromotions')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/promotions')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to get promotions', async () => {
        const spy = jest
            .spyOn(promotionService, 'getVendorPromotions')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/promotions')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with role:vendor scope to get promotion by id', async () => {
        const spy = jest
            .spyOn(promotionService, 'getVendorPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/promotions/123')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to get promotion by id', async () => {
        const spy = jest
            .spyOn(promotionService, 'getVendorPromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/promotions/123')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with role:vendor scope to get promotion stat', async () => {
        const spy = jest
            .spyOn(promotionService, 'getStatOfPromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/promotions/123/stat')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to get promotion stat', async () => {
        const spy = jest
            .spyOn(promotionService, 'getStatOfPromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/promotions/123/stat')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with role:vendor scope to preprocess promotion images', async () => {
        const spy = jest
            .spyOn(promotionService, 'generateImagesForPromotion')
            .mockResolvedValueOnce({} as any);
        jest.spyOn(FlavaVendorManager, 'from').mockResolvedValueOnce(({
            vendorId: '123',
        } as unknown) as FlavaVendorManager);

        await supertest(router)
            .post('/promotions/transformed-images')
            .set('Authorization', portalUserToken)
            .attach('image', Buffer.from('some data'), { filename: 'image.png' });

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to preprocess promotion images', async () => {
        const spy = jest
            .spyOn(promotionService, 'generateImagesForPromotion')
            .mockResolvedValueOnce({} as any);
        jest.spyOn(FlavaVendorManager, 'from').mockResolvedValueOnce(({
            vendorId: '123',
        } as unknown) as FlavaVendorManager);

        const res = await supertest(router)
            .post('/promotions/transformed-images')
            .set('Authorization', randomToken)
            .attach('image', Buffer.from('some data'), { filename: 'image.png' });

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow user with role:vendor scope to update promotion by id', async () => {
        const spy = jest
            .spyOn(promotionService, 'updatePromotion')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .put('/promotions/123')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should forbid user with any other scope than role:vendor to update promotion by id', async () => {
        const spy = jest
            .spyOn(promotionService, 'updatePromotion')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .put('/promotions/123')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });
});

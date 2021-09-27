import dotenv from 'dotenv';
import { Router } from 'express';
import supertest from 'supertest';
import { generateJWTToken } from '../auth/auth-model';
import { db } from '../models';
import app from './../app';
import * as vendorService from './vendor.service';

describe('Vendor Controller', () => {
    dotenv.config({ path: '.env.test' });
    let router: Router;
    const jwtKey = process.env.JWT_SIGNING_KEY;
    const client = {
        grants: 'password',
        id: '5de60cfa7ecd5c7f3754ab16',
    };
    const user = { uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd', roles: ['PORTAL_USER'] };

    const portalUserToken: string = 'Bearer ' + generateJWTToken(client, jwtKey, user);
    const adminUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['ADMIN'] });
    const appUserToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...user, roles: ['APP_USER'] });

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    it('should allow authenticated user with role:admin scope to create a vendor', async () => {
        const spy = jest.spyOn(vendorService, 'createVendor').mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/vendors')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should return forbidden error to authenticated user with any other scope than role:admin when creating a vendor', async () => {
        const spy = jest.spyOn(vendorService, 'createVendor').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/vendors')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow authenticated user with role:vendor scope to get web portal config', async () => {
        const spy = jest
            .spyOn(vendorService, 'getVendorWebPortalConfig')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/vendors/web-portal-config')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should return forbidden error to authenticated user with any other scope than role:vendor when getting web portal config', async () => {
        const spy = jest
            .spyOn(vendorService, 'getVendorWebPortalConfig')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/vendors/web-portal-config')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should retrieve the web portal config for authenticated user', async () => {
        const spy = jest
            .spyOn(vendorService, 'getVendorWebPortalConfig')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/vendors/web-portal-config')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalledWith('7495ebd0-f83b-4959-a650-d3a0a13360bd');
    });

    it('should allow authenticated user with role:vendor scope to get vendor profile', async () => {
        const spy = jest.spyOn(vendorService, 'getVendorProfile').mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/vendors/123')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should allow authenticated user with role:admin scope to get vendor profile', async () => {
        const spy = jest.spyOn(vendorService, 'getVendorProfile').mockResolvedValueOnce({} as any);

        await supertest(router)
            .get('/vendors/123')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should return forbidden error to authenticated user with any other scope than role:vendor or role:admin when getting vendor profile', async () => {
        const spy = jest.spyOn(vendorService, 'getVendorProfile').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/vendors/web-portal-config')
            .set('Authorization', appUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow authenticated user with role:admin scope to create vendor cards', async () => {
        const spy = jest
            .spyOn(vendorService, 'createCardsForVendor')
            .mockResolvedValueOnce({} as any);

        await supertest(router)
            .post('/vendors/123/cards')
            .set('Authorization', adminUserToken)
            .send();

        expect(spy).toHaveBeenCalled();
    });

    it('should return forbidden error to authenticated user with any other scope than role:admin when creating vendor cards', async () => {
        const spy = jest
            .spyOn(vendorService, 'createCardsForVendor')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/vendors/123/cards')
            .set('Authorization', portalUserToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });
});

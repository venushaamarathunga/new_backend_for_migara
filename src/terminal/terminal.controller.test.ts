import dotenv from 'dotenv';
import { Router } from 'express';
import supertest from 'supertest';
import { generateJWTToken } from '../auth/auth-model';
import { db } from '../models';
import app from './../app';
import * as terminalService from './terminal.service';

describe('Terminal Controller', () => {
    dotenv.config({ path: '.env.test' });
    let router: Router;
    const jwtKey = process.env.JWT_SIGNING_KEY;
    const client = {
        grants: ['client_credentials'],
        id: '5de60cfa7ecd5c7f3754ab16',
        roles: ['TERMINAL'],
    };

    const randomToken: string =
        'Bearer ' + generateJWTToken(client, jwtKey, { ...client, roles: ['other_role'] });
    const terminalToken: string = 'Bearer ' + generateJWTToken(client, jwtKey, client);

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    it('should allow client with role:terminal scope to sync check-ins', async () => {
        const spy = jest.spyOn(terminalService, 'syncCheckIns').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/terminals/123/check-ins')
            .set('Authorization', terminalToken)
            .send();

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalled();
    });

    it('should forbid client with any other scope than role:terminal to create redeemable', async () => {
        const spy = jest.spyOn(terminalService, 'syncCheckIns').mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .post('/terminals/123/check-ins')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow client with role:terminal scope to get recent activities', async () => {
        const spy = jest
            .spyOn(terminalService, 'getLast5ActivitiesOfTerminal')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/terminals/123/activities')
            .set('Authorization', terminalToken)
            .send();

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalled();
    });

    it('should forbid client with any other scope than role:terminal to get recent activities', async () => {
        const spy = jest
            .spyOn(terminalService, 'getLast5ActivitiesOfTerminal')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .get('/terminals/123/activities')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });

    it('should allow client with role:terminal scope to cancel activity', async () => {
        const spy = jest
            .spyOn(terminalService, 'cancelActivityFromTerminal')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .delete('/terminals/123/activities/456')
            .set('Authorization', terminalToken)
            .send();

        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalled();
    });

    it('should forbid client with any other scope than role:terminal to cancel activity', async () => {
        const spy = jest
            .spyOn(terminalService, 'cancelActivityFromTerminal')
            .mockResolvedValueOnce({} as any);

        const res = await supertest(router)
            .delete('/terminals/123/activities/456')
            .set('Authorization', randomToken)
            .send();

        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Insufficient scope');
    });
});

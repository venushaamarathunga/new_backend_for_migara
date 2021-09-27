import express, { Router } from 'express';
import request from 'supertest';

import app from './app';
import { ApiErrorResponse } from './middleware/error-handlers/ApiErrorResponse';
import { db } from './models';

describe('routes', () => {
    let router: Router;

    beforeEach(async () => {
        db.connect = jest.fn().mockReturnValue(Promise.resolve());
        router = await app();
    });

    test('index', async done => {
        request(router)
            .get('/')
            .expect(200, done);
    });

    test('should connect to db', async done => {
        expect(db.connect).toHaveBeenCalled();
        done();
    });

    test('should return 404 for non-existing enpoints', async done => {
        request(router)
            .get('/abc')
            .expect(res => {
                const errorBody: ApiErrorResponse = res.body;
                expect(errorBody.statusCode).toEqual(404);
                expect(errorBody.message).toEqual('Method not found.');
            })
            .expect(404, done);
    });
});

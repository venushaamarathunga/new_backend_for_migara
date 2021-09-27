import { NextFunction, Request, Response, Router } from 'express';
import { HTTP404Error } from '../../utils/errors/HTTP404Error';
import { HTTPClientError } from '../../utils/errors/HTTPClientError';
import { ApiErrorResponse } from './ApiErrorResponse';

const handle404Error = (router: Router) => {
    router.use((req: Request, res: Response) => {
        throw new HTTP404Error('Method not found.');
    });
};

const handleClientErrors = (router: Router) => {
    router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof HTTPClientError) {
            console.error(err);
            res.status(err.statusCode).send(
                new ApiErrorResponse(err.statusCode, err.message).toJson()
            );
        } else {
            next(err);
        }
    });
};

const handleServerErrors = (router: Router) => {
    router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error(err);
        if (!(err instanceof Error)) {
            err = new Error(err);
        }
        if (process.env.NODE_ENV === 'production') {
            res.status(500).send(new ApiErrorResponse(500, 'Internal Server Error').toJson());
        } else {
            res.status(500).send(new ApiErrorResponse(500, err.message, err.stack).toJson());
        }
    });
};

export default [handle404Error, handleClientErrors, handleServerErrors];

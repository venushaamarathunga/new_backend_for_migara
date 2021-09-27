import express, { Application } from 'express';
import * as expressWinston from 'express-winston';

import oauth2Server from './auth';
import logger from './logger';
import middleware from './middleware';
import errorHandlers from './middleware/error-handlers/errorHandlers';
import { db } from './models';

// controllers
import authRouter from './auth/auth.controller';
import * as homeController from './controllers/home';
import unAuthorizedUserRouter from './user/user.unauthorized.controller';
import userController from './user/user.controller';
import promotionController from './promotions/promotion.controller';

process.on('uncaughtException', e => {
    console.log(e);
    process.exit(1);
});

process.on('unhandledRejection', e => {
    console.log(e);
    process.exit(1);
});

function initializeApp() {
    const app = express();

    app.use(
        expressWinston.logger({
            winstonInstance: logger
        })
    );
    app.use(
        expressWinston.errorLogger({
            winstonInstance: logger
        })
    );

    applyMiddleware(middleware, app);

    app.use('/auth', authRouter);
    app.use('/', unAuthorizedUserRouter);
    // app.use(oauth2Server.authenticate());
    app.get('/', homeController.index);
    app.use('/users', userController);
    app.use('/promotions', promotionController);
    applyMiddleware(errorHandlers, app);

    return new Promise<Application>((resolve, reject) => {
        db.connect()
            .then(() => {
                console.info('Connected to database');
                resolve(app);
            })
            .catch(error => {
                console.error('Error connecting to database: ', error);
                reject();
                process.exit(1);
            });
    });
}

function applyMiddleware(filters: Array<(router: express.Router) => void>, router: express.Router) {
    for (const func of filters) {
        func(router);
    }
}

export default initializeApp;

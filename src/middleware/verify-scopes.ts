import { NextFunction, Request, Response } from 'express';
import { ForbiddenRequestError } from '../utils/errors/ForbiddenRequestError';

export function verifyScopes(expectedScopes: string[], options: { checkAllScopes?: boolean } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (expectedScopes.length === 0) {
            return next();
        }

        if (!res.locals.oauth.token.scope) {
            return next(new ForbiddenRequestError('Insufficient scope'));
        }

        const userScopes = res.locals.oauth.token.scope.split(' ');
        let allowed;
        if (options.checkAllScopes) {
            allowed = expectedScopes.every(scope => userScopes.includes(scope));
        } else {
            allowed = expectedScopes.some(scope => userScopes.includes(scope));
        }

        return allowed ? next() : next(new ForbiddenRequestError('Insufficient scope'));
    };
}

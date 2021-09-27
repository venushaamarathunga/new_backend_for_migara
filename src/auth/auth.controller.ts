import express from 'express';
import OAuth2Server, { Request, Response, UnauthorizedRequestError } from 'oauth2-server';
import oauth2Server, { oauthServerOptions } from '.';
import PublicClientAuthorizationHandler from './public-client-authorization-handler';

const router = express.Router();

router.post('/token', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body.grant_type === 'authorization_code' && !req.body.client_secret) {
        req.body.code = req.body.code + '#verif#' + req.body.verifier;
        req.body.redirect_uri = 'http://localhost';
    }
    oauth2Server
        .token({
            accessTokenLifetime: process.env.NODE_ENV === 'development' ? 86400 : 3600,
            requireClientAuthentication: {
                authorization_code: false
            }
        })(req, res, next)
        .then((token: OAuth2Server.Token) => {
            res.json(token);
        })
        .catch((err: any) => {
            res.status(err.code || 500).json(err);
        });
});

router.post('/authorize/mobile', (req, res, next) => {
    return new PublicClientAuthorizationHandler().authorizeWithPKCE(req, res, next);
});

router.post('/authorize/terminal', (req, res, next) => {
    return new PublicClientAuthorizationHandler().authorizeForClientSecret(req, res, next);
});

router.post('/token/terminal', (req, res, next) => {
    return new PublicClientAuthorizationHandler().issueClientSecret(req, res, next);
});

const authRouter = router;
export default authRouter;

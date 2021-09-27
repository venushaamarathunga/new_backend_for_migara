// import OAuth2Server = require('oauth2-server');
import ExpressOAuthServer = require('express-oauth-server');
import oauth2Model from './auth-model';

const oauthServerOptions = {
    continueMiddleware: false,
    debug: process.env.NODE_ENV === 'production' ? false : true,
    model: oauth2Model,
    useErrorHandler: false
};

const oauth2Server = new ExpressOAuthServer(oauthServerOptions);

export { oauthServerOptions };
export default oauth2Server;

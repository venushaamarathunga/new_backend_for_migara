import express from 'express';
import { verifyScopes } from '../middleware/verify-scopes';
import { createRedeemableForVendor } from './redeemable.service';

export const redeemableController = express.Router();

redeemableController.post('/redeemables', verifyScopes(['role:vendor']), (req, res, next) => {
    createRedeemableForVendor(res.locals.oauth.token.user.id, req.body)
        .then(created => {
            res.status(200).send(created);
        })
        .catch(next);
});

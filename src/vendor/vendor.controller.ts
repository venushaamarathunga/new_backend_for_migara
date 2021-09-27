import { Router } from 'express';
import { verifyScopes } from '../middleware/verify-scopes';
import {
    createCardsForVendor,
    createVendor,
    getVendorProfile,
    getVendorWebPortalConfig,
} from './vendor.service';

export const vendorController = Router();

vendorController.post('/vendors', verifyScopes(['role:admin']), (req, res, next) => {
    createVendor(req.body)
        .then(vendor => {
            return res.json(vendor);
        })
        .catch(next);
});

vendorController.get(
    '/vendors/web-portal-config',
    verifyScopes(['role:vendor']),
    (req, res, next) => {
        getVendorWebPortalConfig(res.locals.oauth.token.user.id)
            .then(config => {
                res.json(config);
            })
            .catch(next);
    }
);

vendorController.get(
    '/vendors/:vendorId',
    verifyScopes(['role:vendor', 'role:admin']),
    (req, res, next) => {
        getVendorProfile(req.params.vendorId)
            .then(profile => {
                res.json(profile);
            })
            .catch(next);
    }
);

vendorController.post(
    '/vendors/:vendorId/cards',
    verifyScopes(['role:admin']),
    (req, res, next) => {
        createCardsForVendor(req.params.vendorId, req.body.nCards)
            .then(uuids => {
                res.json({
                    uuids,
                });
            })
            .catch(next);
    }
);

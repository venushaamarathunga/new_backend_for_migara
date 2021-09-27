import { Router } from 'express';
import { addTerminalToVendor } from './terminal.service';

export const terminalNoAuthController = Router();

terminalNoAuthController.post('/terminals', (req, res, next) => {
    const prop = {
        cardId: req.body.cardId,
        deviceId: req.body.deviceId,
    };
    return addTerminalToVendor(prop)
        .then(data => {
            return res.json(data);
        })
        .catch(next);
});

terminalNoAuthController.post('/terminals/:id', (req, res, next) => {
    const prop = {
        cardId: req.body.cardId,
        deviceId: req.body.deviceId,
        clientId: req.params.id,
    };
    return addTerminalToVendor(prop)
        .then(data => {
            return res.json(data);
        })
        .catch(next);
});

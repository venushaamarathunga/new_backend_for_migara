import { Router } from 'express';
import { verifyScopes } from '../middleware/verify-scopes';
import {
    addTerminalToVendor,
    cancelActivityFromTerminal,
    getLast5ActivitiesOfTerminal,
    syncCheckIns,
} from './terminal.service';

export const terminalController = Router();

terminalController.post(
    '/terminals/:terminalId/check-ins',
    verifyScopes(['role:terminal']),
    (req, res, next) => {
        const id = req.params.terminalId;
        let clientId = id;
        if (res.locals.oauth.token.user.id === res.locals.oauth.token.client.id) {
            clientId = res.locals.oauth.token.user.id;
        } else {
            clientId = req.body.clientId;
        }
        const checkIns: [
            { uuid: string; utcTimestamp: number; cancelled: boolean; cancelledId: number }
        ] = req.body;

        syncCheckIns(clientId, checkIns)
            .then(response => res.status(200).json(response))
            .catch(next);
    }
);

terminalController.get(
    '/terminals/:terminalId/activities',
    verifyScopes(['role:terminal']),
    (req, res, next) => {
        return getLast5ActivitiesOfTerminal(req.params.terminalId)
            .then(activities => {
                return res.json({ activities });
            })
            .catch(next);
    }
);

terminalController.delete(
    '/terminals/:tId/activities/:activityId',
    verifyScopes(['role:terminal']),
    (req, res, next) => {
        return cancelActivityFromTerminal(req.params.tId, req.params.activityId, req.body.cardId)
            .then(() => {
                res.send();
            })
            .catch(next);
    }
);

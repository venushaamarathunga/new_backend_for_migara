import admin from 'firebase-admin';
import serviceAccount from '../../flava-dev-firebase-adminsdk.json';
import logger from '../logger';
import { IUser } from '../models/user';
import { NotificationPayload } from './NotificationPayload';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

function sendNotification(usersDetails: IUser[], { title, body, imageUrl }: NotificationPayload) {
    const payload: admin.messaging.MessagingPayload = {
        notification: {
            title,
            body,
            imageUrl,
        },
    };
    const options = {
        priority: 'high',
        timeToLive: 60 * 60,
    };

    const newResult: any = [];
    for (const element of usersDetails) {
        const registrationToken = element.firebaseToken;

        const proms = new Promise((resolve, reject) => {
            admin
                .messaging()
                .sendToDevice(registrationToken, payload, options)
                .then((response: any) => {
                    if (response.successCount > 0) {
                        const resultSuccess = {
                            userId: element._id,
                            messageId: response.results[0].messageId,
                        };
                        resolve(resultSuccess);
                        logger.debug(
                            'Successfully sent message to ' +
                                element._id +
                                ' and message id is ' +
                                response.results[0].messageId
                        );
                    } else if (response.failureCount > 0) {
                        const resultError = {
                            userId: element._id,
                            error: response.results[0].error.code,
                        };
                        resolve(resultError);
                        logger.debug(resultError.error + ' to ' + element._id);
                    }
                })
                .catch((error: any) => {
                    reject(error);
                    logger.error('Firebase notification sending failed: ' + error);
                });
        }).catch(error => {
            return {
                userId: element._id,
                error: error.code,
            };
        });
        newResult.push(proms);
    }
    return Promise.all(newResult);
}

export const notificationService = { sendNotification };

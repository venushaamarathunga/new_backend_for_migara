import { ObjectId } from 'bson';
import admin from 'firebase-admin';
import { IUser } from '../models/user';
import { notificationService } from './notification.service';
import { NotificationPayload } from './NotificationPayload';

describe('Notification services', () => {
    it('Should get firebase token and send notification in sendToDevice', async () => {
        const myMock = jest.fn();

        const firebaseToken =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6CO';

        const usersDetails: IUser[] = [
            {
                firebaseToken,
            } as IUser,
        ];

        const notificationPromotion: NotificationPayload = {
            title: 'wfgsdfsfsf',
            body: 'wrgawghk wh gakgh ajkg laag gag',
        };

        const payload = {
            notification: notificationPromotion,
        };

        const options = {
            priority: 'high',
            timeToLive: 60 * 60,
        };

        admin.messaging().sendToDevice = myMock;
        const promise = new Promise((resolves, reject) => {
            const resultSuccess = {
                successCount: 1,
                results: [{ messageId: 'DHDddd' }],
            };
            resolves(resultSuccess);
        });
        myMock.mockReturnValueOnce(promise);

        await notificationService.sendNotification(usersDetails, notificationPromotion);

        expect(myMock).toBeCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Object)
        );

        expect(myMock.mock.calls[0][0]).toMatch(firebaseToken);
        expect(myMock.mock.calls[0][1]).toMatchObject(payload);
        expect(myMock.mock.calls[0][2]).toMatchObject(options);
    });

    it('Should get success result when firebase notification is sent in sendNotification', async () => {
        const resolveMockFn = jest.fn();

        const firebaseToken1 =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6CO';
        const userId1 = new ObjectId('5dbf2de6165f125978fc953d');

        const firebaseToken2 =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6CO';
        const userId2 = new ObjectId('5dbf2de6165f125978fc9d3d');

        const usersDetails: IUser[] = [
            {
                firebaseToken: firebaseToken1,
                _id: userId1,
            } as IUser,
            {
                firebaseToken: firebaseToken2,
                _id: userId2,
            } as IUser,
        ];

        const notificationPromotion: NotificationPayload = {
            title: 'wfgsdfsfsf',
            body: 'wrgawghk wh gakgh ajkg laag gag',
        };

        admin.messaging().sendToDevice = resolveMockFn;

        const promise = new Promise((resolve, rejects) => {
            const result = {
                successCount: 1,
                results: [{ messageId: 'DHDddkjbpod' }],
            };
            resolve(result);
        });
        resolveMockFn.mockReturnValue(promise);

        let value: any = [];
        value = await notificationService.sendNotification(usersDetails, notificationPromotion);

        for (let index = 0; index < value.length; index++) {
            expect(value[index]).toMatchObject({
                messageId: expect.any(String),
                userId: usersDetails[index]._id,
            });
        }
    });

    it('Should get error result when firebase notification is failed in sendNotification', async () => {
        const rejectMockFn = jest.fn();

        const firebaseToken1 =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6C';
        const userId1 = new ObjectId('5dbf2de6165f125978fc9d3d');

        const firebaseToken2 =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_6CO';
        const userId2 = new ObjectId('5dd4f4af7ecd5c7f37548776');

        const usersDetails: IUser[] = [
            {
                firebaseToken: firebaseToken1,
                _id: userId1,
            } as IUser,
            {
                firebaseToken: firebaseToken2,
                _id: userId2,
            } as IUser,
        ];

        const notificationPromotion: NotificationPayload = {
            title: 'wfgsdfsfsf',
            body: 'wrgawghk wh gakgh ajkg laag gag',
        };

        admin.messaging().sendToDevice = rejectMockFn;

        const promise = new Promise((resolve, rejects) => {
            const resultError = {
                failureCount: 1,
                results: [{ error: { code: 'messaging/invalid-registration-token' } }],
            };
            resolve(resultError);
        });
        rejectMockFn.mockReturnValue(promise);

        let value: any = [];
        value = await notificationService.sendNotification(usersDetails, notificationPromotion);

        for (let index = 0; index < value.length; index++) {
            expect(value[index]).toMatchObject({
                error: 'messaging/invalid-registration-token',
                userId: usersDetails[index]._id,
            });
        }
    });

    it('Should send notification reject response on error in sendNotification', async () => {
        const rejectMockFn = jest.fn();

        const firebaseToken =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6CO';

        const userId = new ObjectId('5dd4f4af7ecd5c7f37548776');
        const usersDetails: IUser[] = [
            {
                firebaseToken,
                _id: userId,
            } as IUser,
        ];

        const notificationPromotion: NotificationPayload = {
            title: 'wfgsdfsfsf',
            body: 'wrgawghk wh gakgh ajkg laag gag',
        };

        admin.messaging().sendToDevice = rejectMockFn;

        const promise = new Promise((resolve, reject) => {
            const resultError = {
                error: 'rejection error',
                toString: () => 'rejection error',
            };
            reject(resultError);
        });
        rejectMockFn.mockReturnValueOnce(promise);

        expect(
            notificationService.sendNotification(usersDetails, notificationPromotion)
        ).rejects.toMatchObject({
            error: 'rejection error',
        });
    });

    it('Should send success result for successful notifications and error result for failed notifications in sendNotification', async () => {
        const rejectMockFn = jest.fn();

        const firebaseTokenCorrect =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6CO';
        const userId1 = new ObjectId('5dbf2de6165f125978fc953d');

        const firebaseTokenWrong =
            'ehEBrp_gc9g:APA91bGrryNQFMsKjodmqKgHHV0ADuMKz7mDij2vBhB9Lp7G9HuTQQYzx8SPVhH74fPWimcR10LJJ773tPd-1S0JuhCAZMeiI_si10ar8x41BO8jgv_CJRMa3C4Wh04bBXNrp2e_B6C';
        const userId2 = new ObjectId('5dd4f4af7ecd5c7f37548776');

        const usersDetails: IUser[] = [
            {
                firebaseToken: firebaseTokenWrong,
                _id: userId2,
            } as IUser,
            {
                firebaseToken: firebaseTokenCorrect,
                _id: userId1,
            } as IUser,
        ];

        const notificationPromotion: NotificationPayload = {
            title: 'wfgsdfsfsf',
            body: 'wrgawghk wh gakgh ajkg laag gag',
        };

        admin.messaging().sendToDevice = rejectMockFn;
        const promise = new Promise((resolve, rejects) => {
            const resultError = {
                failureCount: 1,
                results: [{ error: { code: 'messaging/invalid-registration-token' } }],
            };
            resolve(resultError);
        });
        const promisez = new Promise((resolve, rejects) => {
            const resultSucess = {
                successCount: 1,
                results: [{ messageId: 'DHDddkjbpod' }],
            };

            resolve(resultSucess);
        });
        rejectMockFn.mockReturnValueOnce(promise).mockReturnValueOnce(promisez);

        let value: any = [];
        value = await notificationService.sendNotification(usersDetails, notificationPromotion);

        for (let index = 0; index < value.length; index++) {
            if (value[index].error) {
                expect(value[index]).toMatchObject({
                    error: 'messaging/invalid-registration-token',
                    userId: usersDetails[index]._id,
                });
            } else if (value[index].messageId) {
                expect(value[index]).toMatchObject({
                    messageId: 'DHDddkjbpod',
                    userId: usersDetails[index]._id,
                });
            }
        }
    });
});

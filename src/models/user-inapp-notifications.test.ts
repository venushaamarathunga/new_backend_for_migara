import UserInAppNotification, { IUserInAppNotification } from './user-inapp-notifications';

describe('user inapp notification', () => {
    it('should throw validation error for invalid data', async done => {
        const inappNotification = new UserInAppNotification();
        expect(inappNotification.validate).toThrow();
        return done();
    });

    it('should save user-inapp-notification valid data ', async () => {
        const userInAppNotification: IUserInAppNotification = new UserInAppNotification({
            _id: '5dd4f4af7ecd5c7f37548776',
            userId: '5dd38a60c850c205d0ff3075',
            promotionId: '5dd6560c5ef4ec3384e50bd9',
            vendorId: '5dd7884e7ecd5c7f37548f09',
            messageId: 'dgjfbgdlzlvkdzlvzdvk',
            error: 'messaging/invalid-registration-token',
            success: true,
            viewStatus: 'NOT_VIEWED',
        });
        const savefile = await userInAppNotification.save();

        expect(savefile.messageId).toMatch('dgjfbgdlzlvkdzlvzdvk');
        expect(savefile.error).toMatch('messaging/invalid-registration-token');
        expect(savefile.viewStatus).toMatch('NOT_VIEWED');
        expect(savefile.success).toBeTruthy();
    });
});

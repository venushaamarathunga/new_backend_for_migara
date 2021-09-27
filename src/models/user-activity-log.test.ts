import { Error, Types } from 'mongoose';
import UserActivityLog from './user-activity-log';

describe('User model', () => {
    it('Should validate action enum', () => {
        const activity = new UserActivityLog({
            action: 'something',
            userId: Types.ObjectId('5dd38a60c850c205d0ff3075'),
            dateTime: new Date(),
        });

        expect(activity.validate()).rejects.toBeInstanceOf(Error.ValidationError);
    });
});

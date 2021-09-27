import User, { IUser } from './user';

describe('User model', () => {
    it('Should throw validation errors', () => {
        const user = new User();

        expect(user.validate).toThrow();
    });

    it('Should save a user', async () => {
        expect.assertions(4);

        const user: IUser = new User({
            mobileNumber: '121212',
            name: 'Test name'
        });
        const spy = jest.spyOn(user, 'save');

        // Should await so the teardown doesn't throw an exception
        // Thanks @briosheje
        user.save();

        expect(spy).toHaveBeenCalled();

        expect(user).toMatchObject({
            mobileNumber: expect.any(String),
            name: expect.any(String)
        });

        expect(user.mobileNumber).toBe('121212');
        expect(user.name).toBe('Test name');
    });
});

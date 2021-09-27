import userRedeemable, { IUserRedeemable } from './user-redeemables';

describe('user redeemables', () => {
    it('should throw validation error for invalid data', async done => {
        const userRedeemables = new userRedeemable();
        expect(userRedeemables.validate).toThrow();
        return done();
    });

    it('should save user-redeemables valid data', async () => {
        const userRedeemables: IUserRedeemable = new userRedeemable({
            id: '5dd4f4af7ecd5c7f37548776',
            userId: '5dd38a60c850c205d0ff3075',
            vendorId: '5dd7884e7ecd5c7f37548f09',
            targetPoints: 50,
            thumbnailImageUrl:
                'https://images.pexels.com/photos/757889/pexels-photo-757889.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
            imageUrls: [
                'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
            ],
            title: 'Brief Description',
            description: 'Detailed Description',
            expiryDate: new Date('2019-12-15T00:05:32.000Z'),
            redeemStatus: 'UNLOCKED',
        });
        const saveCollection = await userRedeemables.save();

        expect(saveCollection.thumbnailImageUrl).toMatch(
            'https://images.pexels.com/photos/757889/pexels-photo-757889.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'
        );
        expect(saveCollection.imageUrls).toEqual(
            expect.arrayContaining([
                'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
            ])
        );
        expect(saveCollection.targetPoints).toEqual(50);
        expect(saveCollection.title).toMatch('Brief Description');
        expect(saveCollection.description).toMatch('Detailed Description');
        expect(saveCollection.expiryDate).toEqual(new Date('2019-12-15T00:05:32.000Z'));
        expect(saveCollection.redeemStatus).toMatch('UNLOCKED');
    });
});

import PromotionCampaign, { IPromotionCampaign } from './promotion-campaign';

describe('Promotion Campaign', () => {
    it('Should throw validation error', async (done) => {
        const promotion = new PromotionCampaign();
        expect(promotion.validate).toThrow();
        return done();
    });

    it('Should save promotion', async () => {
        const promotionCampaign: IPromotionCampaign = new PromotionCampaign({
            title: 'title of the Promotion',
            thumbnailImageUrl:
                'https://images.pexels.com/photos/757889/pexels-photo-757889.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
            largeImageUrl:
                'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
            briefDescription: 'Brief Description',
            detailedDescription: 'Detailed Description',
            expiresAt: '2019-12-15T00:05:32.000Z', 
        });
        const spy = jest.spyOn(promotionCampaign, 'save');

        const saveFile = await promotionCampaign.save();

        expect(spy).toHaveBeenCalled();

        expect(saveFile).toMatchObject({
            _id: expect.not.stringMatching(''),
            title: expect.any(String),
            thumbnailImageUrl: expect.any(String),
            largeImageUrl: expect.any(String),
            briefDescription: expect.any(String),
            detailedDescription: expect.any(String),
            expiresAt: new Date('2019-12-15T00:05:32.000Z')
        })
    });

});
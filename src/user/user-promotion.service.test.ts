import { Types } from 'mongoose';
import { appConfig } from '../conf/configuration.service';
import models from '../models';
import { PromotionCampaign } from '../models/promotion-campaign';
import { IUser, User } from '../models/user';
import { NOTIFICATION_VIEW_STATUS } from '../models/user-inapp-notifications';
import { IVendor, Vendor } from '../models/vendor';
import PromotionCampaignView from '../promotions/PromotionCampaignView';
import { userPromotionService } from './user-promotion.service';

describe('User PromotionService Service', () => {
    let userPromotion: any[];
    let promotions: any[];
    let userPromotionResult: any;
    let vendor: IVendor;
    let user: IUser;
    appConfig.STORAGE_PUBLIC_BUCKET = 'bucket';

    beforeEach(async () => {
        user = await new User({
            name: 'Kamal',
            roles: ['APP_USER'],
            mobileNumber: '0713930576',
            deviceId: 'ehEBrp_gc9g',
            uuid: 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8',
        }).save();
        vendor = await new Vendor({
            givenName: 'ABC',
            thumbnailImage: 'img',
            terminalImage: 'timg',
            storageBucket: 'bucket',
            pin: '12345',
        }).save();
        const _promotions = getPromotions(true);
        promotions = await PromotionCampaign.insertMany(_promotions);
        userPromotion = [
            {
                _id: Types.ObjectId('5dd4f4af7ecd5c7f37548776'),
                userId: user._id,
                viewStatus: 'NOT_VIEWED',
                promotionId: promotions[0]._id,
                vendorId: vendor._id,
                loadCount: 0,
                viewCount: 0,
                success: true,
            },
            {
                _id: Types.ObjectId('5dd4f4af7ecd5c7f37548778'),
                userId: user._id,
                viewStatus: 'NOT_VIEWED',
                promotionId: promotions[1]._id,
                vendorId: vendor._id,
                loadCount: 0,
                viewCount: 0,
                success: true,
            },
            {
                _id: Types.ObjectId('5dd4f4af7ecd5c7f37548777'),
                userId: user._id,
                viewStatus: 'NOT_VIEWED',
                promotionId: promotions[2]._id,
                vendorId: vendor._id,
                loadCount: 0,
                viewCount: 0,
                success: true,
            },
        ];
        await models.UserInAppNotification.insertMany(userPromotion);
    });

    it('Should increment loadCount and update viewStatus to "LOADED". (getUserPromotion)', async () => {
        const userPromotions: any = await userPromotionService.getUserPromotion(
            user.uuid,
            1,
            10,
            null
        );
        userPromotionResult = await models.UserInAppNotification.findById(
            '5dd4f4af7ecd5c7f37548776'
        );
        expect(userPromotionResult.loadCount).toEqual(1);
        expect(userPromotionResult.viewCount).toEqual(0);
        expect(userPromotionResult.viewStatus).toEqual(NOTIFICATION_VIEW_STATUS.LOADED);
    });

    it('Should increment loadCount and update viewStatus to "LOADED". (getVendorPromotion)', async () => {
        const userPromotions: any = await userPromotionService.getVendorPromotion(
            user.uuid,
            vendor._id,
            1,
            10,
            null
        );
        userPromotionResult = await models.UserInAppNotification.findById(
            '5dd4f4af7ecd5c7f37548776'
        );
        expect(userPromotionResult.loadCount).toEqual(1);
        expect(userPromotionResult.viewCount).toEqual(0);
        expect(userPromotionResult.viewStatus).toEqual(NOTIFICATION_VIEW_STATUS.LOADED);
    });

    it('Should increment viewCount and update viewStatus to "VIEWED".', async () => {
        const updateResponse = await userPromotionService.updatePromotionViewCount(
            user.uuid,
            userPromotion[0].promotionId
        );
        expect(updateResponse.success).toEqual(true);
        userPromotionResult = await models.UserInAppNotification.findById(
            '5dd4f4af7ecd5c7f37548776'
        );
        expect(userPromotionResult.viewCount).toEqual(1);
        expect(userPromotionResult.viewStatus).toEqual(NOTIFICATION_VIEW_STATUS.VIEWED);
    });
});

function getPromotionCampaign(
    expiresAt: string,
    scheduledDate: string,
    targetAllFlavaCustomers: boolean
) {
    const title: string = 'promotion.title';
    const description: string = 'promotion.detailedDescription';
    const thumbnailImageUrl: string = 'promotion.thumbnailImageUrl';
    const imageUrls = [' promotion.largeImageUrl'];
    const executed: boolean = false;

    const promotion: PromotionCampaignView = {
        type: 'promo',
        expiresAt,
        scheduledDate,
        title,
        description,
        thumbnailImageUrl,
        imageUrls,
        targetAllFlavaCustomers,
        executed,
    } as PromotionCampaignView;
    return promotion;
}

function getPromotions(targetAllFlavaCustomers: boolean) {
    const scheduledDate: string = '2020-02-18';
    const expiresAt: string = '2020-05-18';
    const title: string = 'promotion.title';
    const vendorId: string = '5dd7884e7ecd5c7f37548f09';
    const description: string = 'promotion.detailedDescription';
    const thumbnailImageUrl: string = 'promotion.thumbnailImageUrl';
    const imageUrls: string[] = ['promotion.largeImageUrl'];
    const executed: boolean = false;

    const promotions = [];
    for (let index = 0; index < 5; index++) {
        const p = new PromotionCampaign({
            type: 'promo',
            vendorId,
            expiresAt,
            scheduledDate,
            title,
            detailedDescription: description,
            thumbnailImageUrl,
            imageUrls,
            targetAllFlavaCustomers,
            executed,
            storageBucket: 'bucket',
        });
        promotions.push(p);
    }

    return promotions;
}

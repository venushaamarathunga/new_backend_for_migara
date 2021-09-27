import { Types } from 'mongoose';
import { appConfig } from '../conf/configuration.service';
import models from '../models';
import { IPromotionCampaign, PromotionCampaign } from '../models/promotion-campaign';
import { IUser, User } from '../models/user';
import { VendorManager } from '../models/vendor-manager';
import { notificationService } from '../notification/notification.service';
import { StorageHelper } from '../utils/storage/storage.service';
import {
    createPromotion,
    executePromotion,
    getVendorPromotion,
    getVendorPromotions,
    updatePromotion,
} from './promotion.service';
import PromotionCampaignView from './PromotionCampaignView';

describe('Promotion Service', () => {
    appConfig.STORAGE_PUBLIC_BUCKET = 'bucket';
    beforeEach(() => {
        spyOn(StorageHelper.getInstance(), 'uploadFile');
        spyOn(StorageHelper.getInstance(), 'getPublicUrlForResource');
    });

    it('Should set notification expiresAt date and scheduledDate on createPromotion', async () => {
        const mockPromotion = jest.fn();

        const user = {
            _id: Types.ObjectId('5dd4f4af7ecd5c7f37548776'),
            uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
            name: 'Kamal',
            roles: ['PORTAL_USER'],
            mobileNumber: '0713930576',
            deviceId: 'ehEBrp_gc9g',
        };

        const vendorManager = {
            userId: '5dd4f4af7ecd5c7f37548776',
            vendorId: '5dd7884e7ecd5c7f37548f09',
        };

        await VendorManager.insertMany(vendorManager);
        await User.insertMany(user);

        const portalUserUUID = '7495ebd0-f83b-4959-a650-d3a0a13360bd';
        const expiresAt: string = '2020-05-18';
        const scheduledDate: string = new Date().toISOString();
        const targetAllFlavaCustomers: boolean = true;

        const promotion = getPromotionCampaign(expiresAt, scheduledDate, targetAllFlavaCustomers);

        const promise = new Promise((resolve, reject) => {
            const checkDates = {
                expiresAt,
            };

            resolve(checkDates);
        });
        mockPromotion.mockReturnValue(promise);

        const value = await createPromotion(promotion, portalUserUUID);

        expect(value.expiresAt.toISOString()).toMatch(
            new Date(`${expiresAt} 23:59:59.999`).toISOString()
        );
    }, 10000);

    it('Should send notification all customer when targetAllFlavaCustomers is true in executePromotion', async () => {
        const users = [
            {
                firebaseToken: 'firebase token 1',
                roles: ['APP_USER'],
                name: 'Amal',
                mobileNumber: '0717562563',
                deviceId: '5dd4f4af7kal5c7f37548776',
                uuid: '3b280865-2e25-4f99-82fc-a9e5cbc55c8c',
            },
            {
                firebaseToken: 'firebase token 2',
                roles: ['MINICARD_USER'],
                name: 'Sirimal',
                mobileNumber: '0712572563',
                deviceId: '5dd4f4af7kal5c7f86548776',
                uuid: '12756e03-ff35-4489-a8be-075e3925ccb4',
            },
            {
                firebaseToken: 'firebase token 3',
                roles: ['MINICARD_USER'],
                name: 'Vimal',
                mobileNumber: '0712562566',
                deviceId: '5dd4f4af7kww5c7f37548776',
                uuid: '85cf692b-4e72-47a3-9da0-83c27c4a2783',
            },
            {
                firebaseToken: 'firebase token 4',
                roles: ['APP_USER'],
                name: 'Namal',
                mobileNumber: '0712862563',
                deviceId: '5dd4f4af7kal5c7f37548789',
                uuid: '23caf2d3-87b0-4ff2-81ee-cbde5436b9b4',
            },
            {
                firebaseToken: 'firebase token 5',
                roles: ['PORTAL_USER'],
                name: 'Nimal',
                mobileNumber: '0712589563',
                deviceId: '5d4ff4af7kal5c7f37548776',
                uuid: 'b122b9fa-d478-4a44-878e-82541d15a137',
            },
            {
                firebaseToken: 'firebase token 6',
                roles: ['APP_USER'],
                name: 'kamal',
                mobileNumber: '0712562563',
                deviceId: '5dd4f4af7kal5c7f86548776',
                uuid: '05e588ff-6d71-4959-bdf4-191f87a762b0',
            },
        ];

        const mockSendNotification = jest.fn();
        const targetAllFlavaCustomers: boolean = true;
        const scheduledDate: string = new Date().toISOString();

        const promotionDetails = getPromotionDetails(targetAllFlavaCustomers, scheduledDate);

        await User.insertMany(users);

        notificationService.sendNotification = mockSendNotification;

        const promise = new Promise((resolve, rejects) => {
            const response = [
                {
                    // userId: '5def85a9e4e2f54898f3b230',
                    messageId: 'test messageId 1',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def80bde4e2f54898f3b226',
                    messageId: 'test messageId 2',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def8484e4e2f54898f3b22b',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 1',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 2',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 3',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    messageId: 'test messageId 3',
                },
            ];
            resolve(response);
        });
        mockSendNotification.mockReturnValue(promise);

        const value: any = await executePromotion(promotionDetails);

        const notificationPromotion = {
            title: value.title,
            body: value.description,
        };

        expect(mockSendNotification).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(Object));

        expect(mockSendNotification.mock.calls[0][1]).toMatchObject(notificationPromotion);

        const firebaseTokenArray: any[] = [];
        const mockFirebaseTokenArray: any[] = [];

        for (let i = 0; i < mockSendNotification.mock.calls[0][0].length; i++) {
            mockFirebaseTokenArray[i] = mockSendNotification.mock.calls[0][0][i].firebaseToken;
        }
        for (let i = 0; i < users.length; i++) {
            firebaseTokenArray[i] = users[i].firebaseToken;
        }

        expect(firebaseTokenArray).toEqual(expect.arrayContaining(mockFirebaseTokenArray));

        expect(mockFirebaseTokenArray.length).toEqual(5);
    }, 10000);

    it('Should send notification vendor customers when targetAllFlavaCustomers is false in executePromotion', async () => {
        const vendorCustomers = [
            {
                userId: '5def80bde4e2f54898f3b226',
                vendorId: '5dd7884e7ecd5c7f37548f09',
            },
            {
                userId: '5def8484e4e2f54898f3b22b',
                vendorId: '5dd7884e7ecd5c7f37548f09',
            },
            {
                userId: '5def85a9e4e2f54898f3b230',
                vendorId: '5dd7884e7ecd5c7f37548f09',
            },
            {
                userId: '5def85cde4e2f54898f3b235',
                vendorId: '5dd7884e7ecd5c7f37548f09',
            },
        ];

        const users = [
            {
                _id: '5def80bde4e2f54898f3b226',
                roles: ['APP_USER'],
                deviceId: 'eivhKDPifVA',
                firebaseToken: 'firebase token 1',
                mobileNumber: '0714174789',
                name: 'Lihini',
                uuid: '3b280865-2e25-4f99-82fc-a9e5cbc55c8c',
            },
            {
                _id: '5def8484e4e2f54898f3b22b',
                roles: ['MINICARD_USER'],
                deviceId: 'ehEBrp_gc9g',
                firebaseToken: 'firebase token 2',
                mobileNumber: '0713930576',
                name: 'Venusha',
                uuid: '12756e03-ff35-4489-a8be-075e3925ccb4',
            },
            {
                _id: '5def85a9e4e2f54898f3b230',
                roles: ['APP_USER'],
                deviceId: 'djrOGTELuQE',
                firebaseToken: 'firebase token 3',
                mobileNumber: '0716458668',
                name: 'Randunu',
                uuid: '85cf692b-4e72-47a3-9da0-83c27c4a2783',
            },
            {
                _id: '5def85cde4e2f54898f3b235',
                roles: ['MINICARD_USER'],
                deviceId: 'abcdefgh',
                firebaseToken: 'firebase token 4',
                mobileNumber: '0711767691',
                name: 'Piumika ',
                uuid: '23caf2d3-87b0-4ff2-81ee-cbde5436b9b4',
            },
        ];
        const mockSendNotification = jest.fn();

        const targetAllFlavaCustomers: boolean = false;

        const scheduledDate: string = new Date().toISOString();

        const promotionDetails = getPromotionDetails(targetAllFlavaCustomers, scheduledDate);

        await models.VendorCustomer.insertMany(vendorCustomers);
        await User.insertMany(users);

        notificationService.sendNotification = mockSendNotification;

        const promise = new Promise((resolve, rejects) => {
            const response = [
                {
                    // userId: '5def85a9e4e2f54898f3b230',
                    messageId: 'test messageId 1',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def80bde4e2f54898f3b226',
                    messageId: 'test messageId 2',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def8484e4e2f54898f3b22b',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 1',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 2',
                },
            ];
            resolve(response);
        });
        mockSendNotification.mockReturnValue(promise);

        const value: any = await executePromotion(promotionDetails);

        const notificationPromotion = {
            title: value.title,
            body: value.description,
        };

        expect(mockSendNotification).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(Object));

        expect(mockSendNotification.mock.calls[0][1]).toMatchObject(notificationPromotion);

        const firebaseTokenArray: any[] = [];
        const mockFirebaseTokenArray: any[] = [];

        for (let i = 0; i < mockSendNotification.mock.calls[0][0].length; i++) {
            mockFirebaseTokenArray[i] = mockSendNotification.mock.calls[0][0][i].firebaseToken;
        }
        for (let i = 0; i < users.length; i++) {
            firebaseTokenArray[i] = users[i].firebaseToken;
        }

        expect(firebaseTokenArray).toEqual(expect.arrayContaining(mockFirebaseTokenArray));
    }, 10000);

    it('Should set promotion executed as true when send notification are sent to customers in executePromotion', async () => {
        const users = [
            {
                _id: '5dd4f4af7ecd5c7f37548776',
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
            },
            {
                firebaseToken: 'firebase token 1',
                roles: ['APP_USER'],
                name: 'Amal',
                mobileNumber: '0717562563',
                deviceId: '5dd4f4af7kal5c7f37548776',
                uuid: '4a50ca72-2fcf-4aa0-927e-9b897d411bc4',
            },
        ];

        const vendorManager = {
            userId: '5dd4f4af7ecd5c7f37548776',
            vendorId: '5dd7884e7ecd5c7f37548f09',
        };

        await VendorManager.insertMany(vendorManager);
        await User.insertMany(users);

        const portalUserUUID = '7495ebd0-f83b-4959-a650-d3a0a13360bd';

        const mockSendNotification = jest.fn();
        const targetAllFlavaCustomers: boolean = true;
        const expiresAt: string = '2020-05-18';
        const scheduledDate: string = new Date().toISOString();

        const promotion = getPromotionCampaign(expiresAt, scheduledDate, targetAllFlavaCustomers);

        notificationService.sendNotification = mockSendNotification;
        const promise = new Promise((resolve, rejects) => {
            const result = [
                {
                    userId: '5def85a9e4e2f54898f3b230',
                    messageId: 'test messageId 1',
                },
            ];
            resolve(result);
        });
        mockSendNotification.mockReturnValue(promise);

        const value = await createPromotion(promotion, portalUserUUID);

        expect(value.executed).toEqual(true);
    }, 10000);

    it('Should save all success and failed notification in user-inapp-notification collection in executePromotion', async () => {
        const users = [
            {
                firebaseToken: 'firebase token 1',
                roles: ['APP_USER'],
                name: 'Amal',
                mobileNumber: '0717562563',
                deviceId: 'abcdefgh',
                uuid: '4a50ca72-2fcf-4aa0-927e-9b897d411bc4',
            },
            {
                firebaseToken: 'firebase token 2',
                roles: ['MINICARD_USER'],
                name: 'Sirimal',
                mobileNumber: '0712572563',
                deviceId: 'ijklmnop',
                uuid: 'fc2fb104-f57f-486b-9e26-d57d0394d662',
            },
            {
                firebaseToken: 'firebase token 3',
                roles: ['MINICARD_USER'],
                name: 'Vimal',
                mobileNumber: '0712562566',
                deviceId: 'qrstuvwx',
                uuid: 'e35a8e60-eb82-4a04-a884-e72b529c6bec',
            },
            {
                firebaseToken: 'firebase token 4',
                roles: ['APP_USER'],
                name: 'Namal',
                mobileNumber: '0712862563',
                deviceId: 'yzabcdef',
                uuid: 'ddfc90ec-e50b-49d3-8ddf-da0f3227c3f8',
            },
            {
                firebaseToken: 'firebase token 5',
                roles: ['MINICARD_USER'],
                name: 'Nimal',
                mobileNumber: '0712589563',
                deviceId: 'ghijklmn',
                uuid: 'fc4a13d1-5dd8-4547-8f78-7cf808ec756a',
            },
            {
                firebaseToken: 'firebase token 6',
                roles: ['APP_USER'],
                name: 'kamal',
                mobileNumber: '0712562563',
                deviceId: 'opqrstuv',
                uuid: '1fe3e56d-ef8f-4a3e-93d3-eaa5378122f7',
            },
        ];

        const mockSendNotification = jest.fn();
        const mockInsertMany = jest.fn();

        const targetAllFlavaCustomers: boolean = true;
        const scheduledDate: string = new Date().toISOString().split('T')[0];

        const promotionDetails = getPromotionDetails(targetAllFlavaCustomers, scheduledDate);

        await User.insertMany(users);

        notificationService.sendNotification = mockSendNotification;

        const promise = new Promise((resolve, rejects) => {
            const response = [
                {
                    // userId: '5def85a9e4e2f54898f3b230',
                    messageId: 'test messageId 1',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def80bde4e2f54898f3b226',
                    messageId: 'test messageId 2',
                    promotionId: promotionDetails._id,
                },
                {
                    // userId: '5def8484e4e2f54898f3b22b',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 1',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 2',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    error: 'this is test error 3',
                },
                {
                    // userId: '5def85cde4e2f54898f3b235',
                    promotionId: promotionDetails._id,
                    messageId: 'test messageId 3',
                },
            ];
            resolve(response);
        });
        mockSendNotification.mockReturnValue(promise);

        models.UserInAppNotification.insertMany = mockInsertMany;

        await executePromotion(promotionDetails);

        const userInAppNotifications: any[] = [];

        expect(mockInsertMany).toHaveBeenCalledWith(jasmine.any(Array));

        const successResult: any[] = [true, false];
        let successCount = 0;
        let failerCount = 0;
        for (let i = 0; i < mockInsertMany.mock.calls[0][0].length; i++) {
            userInAppNotifications[i] = mockInsertMany.mock.calls[0][0][i].success;
            if (userInAppNotifications[i] === true) {
                successCount++;
            } else if (userInAppNotifications[i] === false) {
                failerCount++;
            }
        }

        // console.log(userInAppNotifications);

        expect(successResult).toEqual(expect.arrayContaining(userInAppNotifications));
        expect(successCount).toEqual(3);
        expect(failerCount).toEqual(3);
        // console.log(`success count:  ${successCount} failer count : ${failerCount}`);
    }, 20000);

    describe('getVendorPromotions()', () => {
        let vendorId: Types.ObjectId;

        beforeEach(async () => {
            vendorId = new Types.ObjectId();
            return new User({
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
            })
                .save()
                .then(user => {
                    return new VendorManager({
                        vendorId,
                        userId: user._id,
                    }).save();
                })
                .catch(e => {
                    throw e;
                });
        });

        it('should return non executed promotions by default for the given vendor', async () => {
            await PromotionCampaign.insertMany([
                {
                    type: 'promo',
                    vendorId,
                    title: 'Promo 1',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                },
                {
                    type: 'product',
                    vendorId,
                    title: 'Promo 2',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: false,
                },
                {
                    type: 'notice',
                    vendorId,
                    title: 'Promo 3',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                },
                {
                    type: 'promo',
                    vendorId,
                    title: 'Promo 4',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: true,
                },
            ]);

            const res = await getVendorPromotions(
                '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                vendorId.toHexString(),
                1,
                10
            );

            expect(res.data.length).toBe(3);
            expect(res.data[0].title).toBe('Promo 1');
            expect(res.data[1].title).toBe('Promo 2');
            expect(res.data[2].title).toBe('Promo 3');
        });

        it('should return executed promotions by default for the given vendor when published is true', async () => {
            await PromotionCampaign.insertMany([
                {
                    type: 'promo',
                    vendorId,
                    title: 'Promo 1',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: true,
                },
                {
                    type: 'product',
                    vendorId,
                    title: 'Promo 2',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: true,
                },
                {
                    type: 'notice',
                    vendorId,
                    title: 'Promo 3',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: true,
                },
                {
                    type: 'promo',
                    vendorId,
                    title: 'Promo 4',
                    expiresAt: new Date('3000-10-01'),
                    scheduledDate: new Date('2020-02-02'),
                    targetAllFlavaCustomers: false,
                    executed: false,
                },
            ]);

            const res = await getVendorPromotions(
                '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                vendorId.toHexString(),
                1,
                10,
                'asc',
                true
            );

            expect(res.data.length).toBe(3);
            expect(res.data[0].title).toBe('Promo 1');
            expect(res.data[1].title).toBe('Promo 2');
            expect(res.data[2].title).toBe('Promo 3');
        });

        it('should throw error if authenticated user is not a vendor manager', async () => {
            return expect(
                getVendorPromotions(
                    '1f7239f9-d34e-46fb-a855-6d3569052702',
                    vendorId.toHexString(),
                    1,
                    10
                )
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 18002,
            });
        });

        it('should throw error if authenticated user does not belong to the requested vendor', async () => {
            const userId = new Types.ObjectId();
            await new User({
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                uuid: '1f7239f9-d34e-46fb-a855-6d3569052702',
            });
            await new VendorManager({
                vendorId: new Types.ObjectId(),
                userId,
            }).save();

            return expect(
                getVendorPromotions(
                    '1f7239f9-d34e-46fb-a855-6d3569052702',
                    vendorId.toHexString(),
                    1,
                    10
                )
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 18002,
            });
        });
    });

    describe('getVendorPromotion()', () => {
        let vendorId: Types.ObjectId;
        let promo: IPromotionCampaign;

        beforeEach(async () => {
            vendorId = new Types.ObjectId();
            return new User({
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
            })
                .save()
                .then(user => {
                    return new VendorManager({
                        vendorId,
                        userId: user._id,
                    }).save();
                })
                .then(() => {
                    promo = new PromotionCampaign({
                        type: 'promo',
                        vendorId,
                        title: 'Promo 1',
                        expiresAt: new Date('3000-10-01'),
                        scheduledDate: new Date('2020-02-02'),
                        targetAllFlavaCustomers: false,
                    });
                    return promo.save();
                })
                .catch(e => {
                    throw e;
                });
        });

        it('should return promotion details for the given promotion id', async () => {
            const res = await getVendorPromotion('7495ebd0-f83b-4959-a650-d3a0a13360bd', promo.id);

            expect(res.id).toEqual(promo.id);
            expect(res.type).toBe('promo');
            expect(res.title).toBe('Promo 1');
            expect(res.description).toBeUndefined();
            expect(res.expiresAt).toBe('3000-10-01');
            expect(res.scheduledDate).toBe(new Date('2020-02-02').toISOString());
            expect(res.targetAllFlavaCustomers).toBeFalsy();
            expect(res.executed).toBeFalsy();
            expect(res.imageUrls).toMatchObject([]);
            expect(res.pricingModel).toBeUndefined();
            expect(res.tags).toMatchObject([]);
            expect(res.thumbnailImageUrl).toBeUndefined();
            expect(res.webUrl).toBeUndefined();
            expect(res.reached).toBeUndefined();
            expect(res.totalClicked).toBeUndefined();
            expect(res.uniqueClicked).toBeUndefined();
        });

        it('should throw error if a promotion was not found', async () => {
            await expect(
                getVendorPromotion('7495ebd0-f83b-4959-a650-d3a0a13360bd', 'another')
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 14002,
            });
            return expect(
                getVendorPromotion(
                    '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                    new Types.ObjectId().toHexString()
                )
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 14002,
            });
        });

        it('should throw error if authenticated user is not a vendor manager', async () => {
            return expect(
                getVendorPromotion('1f7239f9-d34e-46fb-a855-6d3569052702', promo.id)
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 18002,
            });
        });

        it('should throw error if authenticated user does not belong to the vendor of the requested promotion', async () => {
            const userId = new Types.ObjectId();
            await new VendorManager({
                vendorId: new Types.ObjectId(),
                userId,
                uuid: '1f7239f9-d34e-46fb-a855-6d3569052702',
            }).save();

            return expect(
                getVendorPromotion('1f7239f9-d34e-46fb-a855-6d3569052702', promo.id)
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 18002,
            });
        });
    });

    describe('updatePromotion()', () => {
        let promotion: IPromotionCampaign;

        beforeEach(() => {
            return new User({
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
            })
                .save()
                .then(u => {
                    return new VendorManager({
                        userId: u._id,
                        vendorId: '5dd7884e7ecd5c7f37548f09',
                    }).save();
                })
                .then(() => {
                    promotion = new PromotionCampaign(
                        getPromotionDetails(false, new Date().toISOString())
                    );
                    return promotion.save();
                })
                .catch(e => {
                    throw e;
                });
        });

        it('should update all fields except vendorId and type of a promotion', async () => {
            const scheduledDate: string = new Date('3021-01-01').toISOString();
            const data = getPromotionCampaign('3030-05-18', scheduledDate, true);
            data.pricingModel = {
                type: 'price_off',
                value: 300,
                currentPrice: 0,
            };
            data.title = 'new title';

            const res = await updatePromotion(
                '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                promotion.id,
                data
            );

            expect(res.id).toEqual(promotion.id);
            expect(res.vendorId.toHexString()).toEqual(promotion.vendorId.toHexString());
            expect(res.title).toEqual('new title');
            expect(res.description).toEqual('promotion.detailedDescription');
            expect(res.thumbnailImageUrl).toEqual(
                `promotions/images/${promotion.vendorId.toHexString()}_${promotion.id}_thumb.png`
            );
            expect(res.imageUrls[0]).toEqual(
                `promotions/images/${promotion.vendorId.toHexString()}_${promotion.id}_large.png`
            );
            expect(res.expiresAt.toISOString()).toMatch(
                new Date(`3030-05-18 23:59:59.999`).toISOString()
            );
            expect(res.scheduledDate.toISOString()).toEqual(scheduledDate);
            expect(res.targetAllFlavaCustomers).toBeTruthy();
            expect(res.executed).toBeFalsy();
            expect(res.pricingModel).toMatchObject({
                type: 'price_off',
                value: 300,
                currentPrice: 0,
            });
        });

        it('should ignore the update if the promotion is already executed', async () => {
            await PromotionCampaign.findByIdAndUpdate(promotion._id, { executed: true });
            const scheduledDate: string = new Date('3021-01-01').toISOString();
            const data = getPromotionCampaign('3030-05-18', scheduledDate, true);
            data.pricingModel = {
                type: 'price_off',
                value: 300,
                currentPrice: 0,
            };
            data.title = 'new title';

            const res = await updatePromotion(
                '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                promotion.id,
                data
            );

            expect(res.isModified()).toBeFalsy();
        });

        it('should throw error if authenticated user is attempting to update a promotion of another vendor', async () => {
            new User({
                uuid: '1f7239f9-d34e-46fb-a855-6d3569052702',
                mobileNumber: '###',
                deviceId: '###',
                name: 'SilverLight',
            })
                .save()
                .then(user => {
                    return new VendorManager({
                        userId: user._id,
                        vendorId: new Types.ObjectId(),
                    }).save();
                })
                .catch(e => {
                    throw e;
                });

            return expect(
                updatePromotion('1f7239f9-d34e-46fb-a855-6d3569052702', promotion.id, {} as any)
            ).rejects.toMatchObject({
                message: 'Invalid id given',
                errorCode: 18002,
            });
        });
    });

    /*
    let clock: any;
    beforeEach(() => {
    });
    
     it('scould verify notification is sent not executed scheduled date useing Cronjob in createPromotion', async () => {
        clock = sinon.useFakeTimers(new Date('12/21/2019'));
        const mockExecutePromotion = jest.fn();
        const userId = '5def85a9e4e2f54898f3b230';

        let users = [
            {
                firebaseToken: 'firebase token 1',
                roles: ['APP_USER'],
                name: 'Amal',
                mobileNumber: '0717562563',
                deviceId: '5dd4f4af7kal5c7f37548776'
            },
            {
                firebaseToken: 'firebase token 2',
                roles: ['MINICARD_USER'],
                name: 'Sirimal',
                mobileNumber: '0712572563',
                deviceId: '5dd4f4af7kal5c7f86548776'
            },
            {
                firebaseToken: 'firebase token 3',
                roles: ['MINICARD_USER'],
                name: 'Vimal',
                mobileNumber: '0712562566',
                deviceId: '5dd4f4af7kww5c7f37548776'
            },
            {
                firebaseToken: 'firebase token 4',
                roles: ['APP_USER'],
                name: 'Namal',
                mobileNumber: '0712862563',
                deviceId: '5dd4f4af7kal5c7f37548789'
            },
            {
                firebaseToken: 'firebase token 5',
                roles: ['PORTAL_USER'],
                name: 'Nimal',
                mobileNumber: '0712589563',
                deviceId: '5d4ff4af7kal5c7f37548776'
            },
            {
                firebaseToken: 'firebase token 6',
                roles: ['APP_USER'],
                name: 'kamal',
                mobileNumber: '0712562563',
                deviceId: '5dd4f4af7kal5c7f86548776'
            }
        ];

        let targetAllFlavaCustomers: boolean = true;
        let scheduledDate: string = '2019-12-22';
        let expiresAt: String = '2020-05-18';

        await models.User.insertMany(users);

        let promotion = getPromotionCampaign(expiresAt, scheduledDate,targetAllFlavaCustomers);

        promotionService.executePromotion = mockExecutePromotion;

        await promotionService.createPromotion(promotion, userId);
        // console.log(value);
        clock.tick(5 * 60 * 1000);
        
        expect(mockExecutePromotion).toHaveBeenCalled();
        clock.restore();

    }, 25000); */
});

function getPromotionDetails(targetAllFlavaCustomers: boolean, scheduledDate: string) {
    const expiresAt: string = '2020-05-18';
    const title: string = 'promotion.title';
    const vendorId: string = '5dd7884e7ecd5c7f37548f09';
    const description: string = 'promotion.detailedDescription';
    const thumbnailImageUrl: string = 'promotion.thumbnailImageUrl';
    const imageUrls: string[] = ['promotion.largeImageUrl'];
    const executed: boolean = false;

    return new PromotionCampaign({
        type: 'promo',
        vendorId,
        expiresAt,
        scheduledDate,
        title,
        description,
        thumbnailImageUrl,
        imageUrls,
        targetAllFlavaCustomers,
        executed,
        storageBucket: 'bucket',
    });
}

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

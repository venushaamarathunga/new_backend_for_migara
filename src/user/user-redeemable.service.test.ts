import { ObjectId } from 'bson';
import models from '../models';
import { IUser, User } from '../models/user';
import UserActivityLog from '../models/user-activity-log';
import { IUserRedeemable } from '../models/user-redeemables';
import { IVendor, Vendor } from '../models/vendor';
import { IVendorAuthClient, VendorAuthClient } from '../models/vendor-auth-client';
import { IVendorCustomer } from '../models/vendor-customer';
import { IVendorPointsScheme } from '../models/vendor-points-scheme';
import * as activityLog from './activity-log/user-activity-log.service';
import { changeRedeemStatus, getUserRegisteredVendor } from './user-redeemable.service';
import * as service from './user-redeemable.service';

describe('User Redeemable service', () => {
    let vendorCustomerData: IVendorCustomer;
    let redeemableItemDetails: IUserRedeemable;
    let vendor: IVendor;
    let user: IUser;

    describe('changeRedeemStatus()', () => {
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
            const clinet: IVendorAuthClient = await new VendorAuthClient({
                clientId: 'client-1',
                vendorId: vendor._id,
                cardUuid: '123',
                deviceId: 'abc',
            }).save();
            const pointsScheme: IVendorPointsScheme = await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                default: true,
                fixed: 5,
            }).save();
            vendorCustomerData = await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                createdAt: new Date('2019-12-27T09:12:24.531Z'),
                points: 355,
                totalPointsBurned: 100,
                totalPointsEarned: 135,
                pointsSchemeId: pointsScheme._id,
                updatedAt: new Date('2020-01-06T06:44:39.973Z'),
            }).save();
            redeemableItemDetails = await new models.UserRedeemable({
                userId: user._id,
                vendorId: vendor._id,
                thumbnailImageUrl: 'thumbnail Image Url',
                imageUrls: ['large Image Url'],
                title: 'brief Description test',
                description: 'detailed Description test',
                targetPoints: 50,
                expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                redeemStatus: 'LOCKED',
            }).save();
        });

        it('should change redeemStatus and save it in user redeemable service on changeRedeemStatus', async () => {
            const id: string = redeemableItemDetails._id.toHexString();
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            const value = await changeRedeemStatus(payload);

            expect(value.id).toEqual(id);
            expect(value.title).toEqual('brief Description test');
            expect(value.description).toEqual('detailed Description test');
            expect(value.expiryDate).toEqual(new Date('2011-10-05T14:48:00.000Z'));
            expect(Array.from(value.imageUrls)).toEqual(['large Image Url']);
            expect(value.redeemStatus).toEqual('USED');
            expect(value.thumbnailImageUrl).toEqual('thumbnail Image Url');
        }, 20000);

        it('should change points and calculate total points burned in changeRedeemStatus', async () => {
            const id: string = redeemableItemDetails._id.toHexString();
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            await changeRedeemStatus(payload);
            const vendorCustomerDetails = await models.VendorCustomer.findOne({
                _id: vendorCustomerData._id,
            });
            expect(vendorCustomerDetails.points).toEqual(305);
            expect(vendorCustomerDetails.totalPointsBurned).toEqual(150);
        }, 20000);

        it('should return required redeem status is missing when status is not given in changeRedeemStatus', () => {
            const promise = changeRedeemStatus({
                id: redeemableItemDetails._id.toHexString(),
                uuid: 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8',
                clientId: 'client-1',
                status: '',
                pin: '12345',
            });

            return expect(promise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15001,
            });
        });

        it('should return required pin is missing when pin is not given in changeRedeemStatus', () => {
            const id: string = redeemableItemDetails._id.toHexString();
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            const promiseStatus = changeRedeemStatus(payload);

            return expect(promiseStatus).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15002,
            });
        });

        it('should return vendor collection pin is not matching when incorrect pin is given in changeRedeemStatus', () => {
            const id: string = redeemableItemDetails._id;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '32145';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            const promisePin = changeRedeemStatus(payload);

            return expect(promisePin).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15003,
            });
        });

        it('should return error when a redeemable item was not found for given id in changeRedeemStatus', async () => {
            const id: string = null;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            const promise = changeRedeemStatus(payload);

            return expect(promise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15004,
            });
        });

        it('should verify ownership of a redeemable in changeRedeemStatus', async () => {
            const redeemableItemDetailss = await new models.UserRedeemable({
                userId: new ObjectId('5dfe2718d48e7732b8157a7b'),
                vendorId: new ObjectId('5dfe28c8cae7cc2294053e61'),
                thumbnailImageUrl: 'thumbnail Image Url',
                imageUrls: ['large Image Url'],
                title: 'brief Description test',
                description: 'detailed Description test',
                targetPoints: 50,
                expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                redeemStatus: 'UNLOCKED',
            }).save();

            const id: string = redeemableItemDetailss._id;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';
            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            const promise = changeRedeemStatus(payload);
            return expect(promise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15005,
            });
        });

        it('should return error when consumer points are less than target points in changeRedeemStatus', async () => {
            const id: string = redeemableItemDetails._id;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            vendorCustomerData.points = 40;
            await vendorCustomerData.save();

            const promise = changeRedeemStatus(payload);

            return expect(promise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 15006,
            });
        });

        it('should log redeemable used activity on changeRedeemStatus', async () => {
            const id: string = redeemableItemDetails._id;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            await changeRedeemStatus(payload);

            return expect(UserActivityLog.findOne({ userId: user._id })).resolves.toMatchObject({
                action: 'redeemable_use',
                vendorId: vendor._id,
                redeemableId: id,
            });
        });

        it('should revert redeem status and user points if activity log update failed on changeRedeemStatus', async () => {
            const id: string = redeemableItemDetails._id;
            const uuid: string = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8';
            const clientId: string = 'client-1';
            const status: string = 'USED';
            const pin: string = '12345';

            const payload = {
                id,
                uuid,
                clientId,
                status,
                pin,
            };

            jest.spyOn(activityLog, 'logRedeemableUsedActivity').mockImplementation(() => {
                throw new Error();
            });

            expect(changeRedeemStatus(payload)).rejects.toMatchObject({
                message: 'Redeem item status not update',
                statusCode: 400,
            });

            expect(models.UserRedeemable.findById(id)).resolves.toMatchObject({
                redeemStatus: 'LOCKED',
            });

            return expect(
                models.VendorCustomer.findOne({ userId: user._id, vendorId: vendor._id })
            ).resolves.toMatchObject({
                points: vendorCustomerData.points,
                totalPointsBurned: vendorCustomerData.totalPointsBurned,
                totalPointsEarned: vendorCustomerData.totalPointsEarned,
            });
        });
    });

    describe('getUserRegisteredVendor()', () => {
        let page: number;
        let pageSize: number;
        let includeRedeemable: boolean;

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
            const clinet: IVendorAuthClient = await new VendorAuthClient({
                clientId: 'client-1',
                vendorId: vendor._id,
                cardUuid: '123',
                deviceId: 'abc',
            }).save();
            const pointsScheme: IVendorPointsScheme = await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                default: true,
                fixed: 5,
            }).save();
            vendorCustomerData = await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                createdAt: new Date('2019-12-27T09:12:24.531Z'),
                points: 60,
                totalPointsBurned: 100,
                totalPointsEarned: 135,
                pointsSchemeId: pointsScheme._id,
                updatedAt: new Date('2020-01-06T06:44:39.973Z'),
            }).save();

            const redeemableDetails = [
                {
                    userId: user._id,
                    vendorId: vendor._id,
                    thumbnailImageUrl: 'thumbnail Image Url',
                    imageUrls: ['large Image Url'],
                    title: 'brief Description test',
                    description: 'detailed Description test',
                    targetPoints: 50,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'USED',
                },
                {
                    userId: user._id,
                    vendorId: vendor._id,
                    thumbnailImageUrl: 'thumbnail Image Url 2',
                    imageUrls: ['large Image Url 2'],
                    title: 'brief Description test 2',
                    description: 'detailed Description test 2',
                    targetPoints: 55,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
                {
                    userId: user._id,
                    vendorId: vendor._id,
                    thumbnailImageUrl: 'thumbnail Image Url 3',
                    imageUrls: ['large Image Url 3'],
                    title: 'brief Description test 3',
                    description: 'detailed Description test 3',
                    targetPoints: 67,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
                {
                    userId: user._id,
                    vendorId: vendor._id,
                    thumbnailImageUrl: 'thumbnail Image Url 4',
                    imageUrls: ['large Image Url 4'],
                    title: 'brief Description test 4',
                    description: 'detailed Description test 4',
                    targetPoints: 70,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
                {
                    userId: user._id,
                    vendorId: vendor._id,
                    thumbnailImageUrl: 'thumbnail Image Url 5',
                    imageUrls: ['large Image Url 5'],
                    title: 'brief Description test 5',
                    description: 'detailed Description test 5',
                    targetPoints: 51,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
            ];
            await models.UserRedeemable.insertMany(redeemableDetails);
        });

        it('should check user id is valid when given uuid on getUserRegisteredVendor', async () => {
            page = 1;
            pageSize = 10;
            includeRedeemable = false;
            const uuid = 'd1f5b88f-d92d-4bf3-ac2b-ae71c56d748e';
            const value = getUserRegisteredVendor(
                uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );
            expect(value).rejects.toMatchObject({
                statusCode: 400,
                message: 'Invalid id given',
            });
        });

        it('should get userRegisteredVendor details when given page 1 on getUserRegisteredVendor', async () => {
            page = 1;
            pageSize = 10;
            includeRedeemable = false;

            const value = await getUserRegisteredVendor(
                user.uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );

            const progress = (60 / 67) * 100;

            expect(value.giftsCollected).toEqual(1);
            expect(value.pointsRequiredForNextGift).toEqual(7);
            expect(value.progressToNextGift).toEqual(progress);
            expect(value.pointsEarned).toEqual(60);
        });

        it('Should not get userRegisteredVendor details when given page number is greater than 1 on getUserRegisteredVendor', async () => {
            page = 2;
            pageSize = 2;
            includeRedeemable = false;

            const value = await getUserRegisteredVendor(
                user.uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );

            expect(value.giftsCollected).toEqual(0);
            expect(value.pointsRequiredForNextGift).toEqual(0);
            expect(value.progressToNextGift).toEqual(0);
            expect(value.pointsEarned).toEqual(0);
        });

        it('Should not get redeemable and pagination details when given includeRedeemable is false on getUserRegisteredVendor', async () => {
            page = 2;
            pageSize = 2;
            includeRedeemable = false;

            const value = await getUserRegisteredVendor(
                user.uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );
            expect(value.redeemables).toBeUndefined();
            expect(value.pagination).toBeUndefined();
            expect(value.giftsCollected).toEqual(0);
            expect(value.pointsRequiredForNextGift).toEqual(0);
            expect(value.progressToNextGift).toEqual(0);
            expect(value.pointsEarned).toEqual(0);
        });

        it('Should get redeemable and pagination details when given includeRedeemable is true on getUserRegisteredVendor', async () => {
            page = 2;
            pageSize = 2;
            includeRedeemable = true;

            const value = await getUserRegisteredVendor(
                user.uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );

            const pagination = {
                page: 2,
                pageSize: 2,
                totalElements: 4,
                totalPages: 2,
            };
            const data = [
                {
                    thumbnailImageUrl: 'thumbnail Image Url 3',
                    imageUrls: ['large Image Url 3'],
                    title: 'brief Description test 3',
                    pointsToFulfill: 7,
                    description: 'detailed Description test 3',
                    targetPoints: 67,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
                {
                    thumbnailImageUrl: 'thumbnail Image Url 4',
                    imageUrls: ['large Image Url 4'],
                    title: 'brief Description test 4',
                    pointsToFulfill: 10,
                    description: 'detailed Description test 4',
                    targetPoints: 70,
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
            ];

            expect(value.pagination).toEqual(pagination);
            expect(value.redeemables).toMatchObject(data);
            expect(value.giftsCollected).toEqual(0);
            expect(value.pointsRequiredForNextGift).toEqual(0);
            expect(value.progressToNextGift).toEqual(0);
            expect(value.pointsEarned).toEqual(0);
        });

        it('Should get redeemable details and change status as "UNLOCKED" when targetPoint is less than Earned point on getUserRegisteredVendor', async () => {
            page = 1;
            pageSize = 3;
            includeRedeemable = true;
            const myMock = jest.fn();
            let pageResponse;

            const promise = new Promise((resolve, reject) => {
                pageResponse = {
                    pagination: {
                        page,
                        pageSize,
                        totalElement: 4,
                        totalPage: 2,
                    },
                    redeemables: [
                        {
                            userId: user._id,
                            vendorId: vendor._id,
                            thumbnailImageUrl: 'thumbnail Image Url 2',
                            imageUrls: ['large Image Url 2'],
                            title: 'brief Description test 2',
                            description: 'detailed Description test 2',
                            targetPoints: 55,
                            expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                            redeemStatus: 'LOCKED',
                        },
                        {
                            userId: user._id,
                            vendorId: vendor._id,
                            thumbnailImageUrl: 'thumbnail Image Url 3',
                            imageUrls: ['large Image Url 3'],
                            title: 'brief Description test 3',
                            description: 'detailed Description test 3',
                            targetPoints: 67,
                            expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                            redeemStatus: 'LOCKED',
                        },

                        {
                            userId: user._id,
                            vendorId: vendor._id,
                            thumbnailImageUrl: 'thumbnail Image Url 4',
                            imageUrls: ['large Image Url 4'],
                            title: 'brief Description test 4',
                            description: 'detailed Description test 4',
                            targetPoints: 70,
                            expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                            redeemStatus: 'LOCKED',
                        },
                        {
                            userId: user._id,
                            vendorId: vendor._id,
                            thumbnailImageUrl: 'thumbnail Image Url 5',
                            imageUrls: ['large Image Url 5'],
                            title: 'brief Description test 5',
                            description: 'detailed Description test 5',
                            targetPoints: 51,
                            expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                            redeemStatus: 'LOCKED',
                        },
                    ],
                };
                resolve(pageResponse);
            });
            myMock.mockResolvedValue(promise);

            jest.spyOn(service, 'getVendorRedeemable').mockImplementation(myMock);

            const value = await getUserRegisteredVendor(
                user.uuid,
                vendor._id,
                page,
                pageSize,
                includeRedeemable
            );

            const progress = (60 / 67) * 100;

            expect(value.redeemables[0].redeemStatus).toEqual('UNLOCKED');
            expect(value.redeemables[1].redeemStatus).toEqual('UNLOCKED');
            expect(value.redeemables[2].redeemStatus).toEqual('LOCKED');
            expect(value.redeemables[0].pointsToFulfill).toEqual(0);
            expect(value.redeemables[1].pointsToFulfill).toEqual(0);
            expect(value.giftsCollected).toEqual(1);
            expect(value.pointsRequiredForNextGift).toEqual(7);
            expect(value.progressToNextGift).toEqual(progress);
            expect(value.pointsEarned).toEqual(60);
        });
    });
});

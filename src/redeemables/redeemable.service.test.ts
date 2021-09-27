import { ObjectId } from 'bson';
import { Types } from 'mongoose';
import models, { VendorRedeemable } from '../models';
import { User } from '../models/user';
import { VendorManager } from '../models/vendor-manager';
import { createRedeemableForVendor } from './redeemable.service';

describe('Redeemable Service', () => {
    describe('createRedeemableForVendor()', () => {
        beforeEach(async () => {
            await new User({
                _id: new Types.ObjectId('111222333001'),
                name: 'Kamal',
                roles: ['APP_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
                uuid: '0732071d-7359-45eb-be7f-504f1028ae44',
            }).save();
            await new VendorManager({
                userId: new Types.ObjectId('111222333001'),
                vendorId: new Types.ObjectId('111222444001'),
            }).save();
        });

        it('should create redeemable for authenticated vendor', async () => {
            const redeemable = await createRedeemableForVendor(
                '0732071d-7359-45eb-be7f-504f1028ae44',
                {
                    title: 'new gift',
                    targetPoints: 10,
                }
            );

            // expect(redeemable).toMatchObject({
            //     title: 'new gift',
            // description: undefined,
            // expiryDate: undefined,
            // id: expect.any(String),
            // imageUrls: [],
            // thumbnailImageUrl: undefined,
            // });
            expect(redeemable.title).toBe('new gift');
            expect(redeemable.id).toBeDefined();
            return expect(
                VendorRedeemable.findById(new ObjectId(redeemable.id))
            ).resolves.not.toBeNull();
        });

        it('should create redeemable items for all customers of the authorized vendor', async () => {
            await models.VendorCustomer.insertMany([
                {
                    userId: new ObjectId('111222333000'),
                    vendorId: new Types.ObjectId('111222444001'),
                    points: 0,
                    totalPointsEarned: 0,
                    totalPointsBurned: 0,
                },
                {
                    userId: new ObjectId('111222333001'),
                    vendorId: new Types.ObjectId('111222444001'),
                    points: 0,
                    totalPointsEarned: 0,
                    totalPointsBurned: 0,
                },
            ]);

            await createRedeemableForVendor('0732071d-7359-45eb-be7f-504f1028ae44', {
                title: 'new gift',
                targetPoints: 10,
            });

            const userRedeemables = await models.UserRedeemable.find({
                vendorId: new Types.ObjectId('111222444001'),
            });
            const briefDescriptions = Array.from<string>(
                new Set(userRedeemables.map(r => r.title))
            );
            const targetPoints = Array.from<number>(
                new Set(userRedeemables.map(r => r.targetPoints))
            );
            const redeemStatuses = Array.from<string>(
                new Set(userRedeemables.map(r => r.redeemStatus))
            );
            expect(userRedeemables).toHaveLength(2);
            expect(briefDescriptions).toHaveLength(1);
            expect(briefDescriptions[0]).toEqual('new gift');
            expect(targetPoints).toHaveLength(1);
            expect(targetPoints[0]).toEqual(10);
            expect(redeemStatuses).toHaveLength(1);
            expect(redeemStatuses[0]).toEqual('LOCKED');
        });

        it('should throw an error if a vendor could not be found for the authorized client', () => {
            return expect(
                createRedeemableForVendor('3d55d950-63ea-474e-9947-9aa0e060e848', {
                    title: 'new gift',
                    targetPoints: 10,
                })
            ).rejects.toMatchObject({
                message: 'Invalid client',
                errorCode: 12007,
            });
        });
    });
});

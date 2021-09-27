import { Types } from 'mongoose';
import uuid = require('uuid');

import supertest = require('supertest');
import initializeApp from '../app';
import models, { db } from '../models';
import { IUser, User } from '../models/user';
import UserActivityLog, { UserActivityAction } from '../models/user-activity-log';
import { IVendor, Vendor } from '../models/vendor';
import { VendorAuthClient } from '../models/vendor-auth-client'; //
import { VendorCard } from '../models/vendor-cards';
import { IVendorCustomer } from '../models/vendor-customer';
import VendorPointsScheme from '../models/vendor-points-scheme'; //
import { IVendorPointsScheme } from '../models/vendor-points-scheme';
import * as activityLog from '../user/activity-log/user-activity-log.service';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import * as strutils from '../utils/string/string.utils';
import {
    addTerminalToVendor,
    cancelActivityFromTerminal,
    getLast5ActivitiesOfTerminal,
    syncCheckIns,
} from './terminal.service';

describe('TerminalService', () => {
    describe('addTerminalForVendor()', () => {
        it('should return a client id and vendor details for a terminal if the given vendor card is valid and was not previously assigned to a client', async () => {
            const vendor = await new Vendor({
                givenName: 'Burger King',
                thumbnailImage: 'thumburl',
                terminalImage: 'terminalurl',
                storageBucket: 'bucket',
            }).save();
            const card = await new VendorCard({
                vendorId: vendor._id,
                uuid: uuid.v4(),
            }).save();

            const result = await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
                branch: 'colombo',
            });

            expect(result.clientId).toHaveLength(8);
            expect(result.vendor.name).toEqual('Burger King');
            expect(result.vendor.imageUrl).toEqual(
                'https://storage.googleapis.com/bucket/terminalurl'
            );
            return expect(VendorAuthClient.findOne({ cardUuid: card.uuid })).resolves.toMatchObject(
                {
                    deviceId: 'abc',
                    branch: 'colombo',
                    clientId: result.clientId,
                }
            );
        }, 10000);

        it('should create an authentication client for given client id and vendor card if the card is valid and was not previously assigned to a client', async () => {
            const vendor = await new Vendor({
                givenName: 'Burger King',
                thumbnailImage: 'thumburl',
                terminalImage: 'terminalurl',
                storageBucket: 'bucket',
            }).save();
            const card = await new VendorCard({
                vendorId: vendor._id,
                uuid: uuid.v4(),
            }).save();

            const result = await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
                branch: 'colombo',
                clientId: 'abcdefgh',
            });

            expect(result.clientId).toBe('abcdefgh');
            expect(result.vendor.name).toEqual('Burger King');
            expect(result.vendor.imageUrl).toEqual(
                'https://storage.googleapis.com/bucket/terminalurl'
            );
            return expect(VendorAuthClient.findOne({ cardUuid: card.uuid })).resolves.toMatchObject(
                {
                    deviceId: 'abc',
                    branch: 'colombo',
                    clientId: 'abcdefgh',
                }
            );
        });

        it('should mark a vendor card as used after assigning it to a client', async () => {
            const card = await new VendorCard({
                vendorId: new Types.ObjectId(),
                uuid: uuid.v4(),
            }).save();

            await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
                branch: 'colombo',
                clientId: 'abcdefgh',
            });

            return expect(VendorCard.findOne({ uuid: card.uuid })).resolves.toMatchObject({
                used: true,
            });
        });

        it('should return error if vendor card is not found', async () => {
            expect(
                addTerminalToVendor({
                    cardId: uuid.v4(),
                    deviceId: 'abc',
                })
            ).rejects.toMatchObject({
                message: 'Attempted card is invalid',
                errorCode: 16001,
                statusCode: 400,
            });
        });

        it('should return error if vendor card is already used', async () => {
            const card = await new VendorCard({
                vendorId: new Types.ObjectId(),
                uuid: uuid.v4(),
                used: true,
            }).save();

            expect(
                addTerminalToVendor({
                    cardId: card.uuid,
                    deviceId: 'abc',
                })
            ).rejects.toMatchObject({
                message: 'Attempted card is invalid',
                errorCode: 16001,
                statusCode: 400,
            });
        });

        it('should not return vendor details for a terminal if the allocated vendor details are missing', async () => {
            const card = await new VendorCard({
                vendorId: new Types.ObjectId(),
                uuid: uuid.v4(),
            }).save();

            const result = await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
            });

            expect(result.clientId).toHaveLength(8);
            expect(result.vendor).toBeUndefined();
        });

        it('should return existing terminal configuration if a client already exists for given terminal id', async () => {
            const vendor = await new Vendor({
                givenName: 'Burger King',
                thumbnailImage: 'thumburl',
                terminalImage: 'terminalurl',
                storageBucket: 'bucket',
            }).save();
            const card = await new VendorCard({
                vendorId: vendor._id,
                uuid: uuid.v4(),
            }).save();
            await new VendorAuthClient({
                vendorId: vendor._id,
                cardUuid: card.uuid,
                deviceId: 'abc',
                clientId: 'abcdefgh',
            }).save();

            const result = await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
                clientId: 'abcdefgh',
            });

            expect(result.clientId).toEqual('abcdefgh');
            expect(result.vendor.name).toEqual('Burger King');
            expect(result.vendor.imageUrl).toEqual(
                'https://storage.googleapis.com/bucket/terminalurl'
            );
        });

        it('should return error if vendor card was used on another client', async () => {
            const terminal = await new VendorAuthClient({
                vendorId: new Types.ObjectId(),
                cardUuid: uuid.v4(),
                deviceId: 'abc',
                clientId: 'abcdefgh',
            }).save();

            return expect(
                addTerminalToVendor({
                    cardId: terminal.cardUuid,
                    deviceId: 'abc',
                    clientId: 'ijklmnop',
                })
            ).rejects.toMatchObject({
                responseMsg: 'Your card is not allowed to be used in this terminal',
                errorCode: 16003,
                statusCode: 403,
            });
        });

        it('should return error if vendor card was used on another device', async () => {
            const terminal = await new VendorAuthClient({
                vendorId: new Types.ObjectId(),
                cardUuid: uuid.v4(),
                deviceId: 'abc',
                clientId: 'abcdefgh',
            }).save();

            return expect(
                addTerminalToVendor({
                    cardId: terminal.cardUuid,
                    deviceId: 'xyz',
                    clientId: 'abcdefgh',
                })
            ).rejects.toMatchObject({
                responseMsg: 'Your card is not allowed to be used in this terminal',
                errorCode: 16003,
                statusCode: 403,
            });
        });

        it('should return error given card id is not a uuid', async () => {
            expect(
                addTerminalToVendor({
                    cardId: 'something',
                    deviceId: 'abc',
                })
            ).rejects.toMatchObject({
                message: 'Attempted card is invalid',
                errorCode: 16001,
                statusCode: 400,
            });
        });

        it('should return error given client id not a 8 character string', async () => {
            expect(
                addTerminalToVendor({
                    cardId: uuid.v4(),
                    deviceId: 'abc',
                    clientId: '1234',
                })
            ).rejects.toMatchObject({
                message: 'Invalid parameters',
                errorCode: 16002,
                statusCode: 400,
            });
        });

        it('integration: should be able to get an authorization token for the clientId received', async () => {
            const vendor = await new Vendor({
                givenName: 'Burger King',
                thumbnailImage: 'thumburl',
                terminalImage: 'terminalurl',
                storageBucket: 'bucket',
            }).save();
            const card = await new VendorCard({
                vendorId: vendor._id,
                uuid: uuid.v4(),
            }).save();

            const result = await addTerminalToVendor({
                cardId: card.uuid,
                deviceId: 'abc',
            });

            db.connect = jest.fn().mockReturnValue(Promise.resolve());
            const app = await initializeApp();
            const authCode = await supertest(app)
                .post('/auth/authorize/terminal')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                    challenge: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
                    client_id: result.clientId,
                });

            expect(authCode.status).toBe(200);
            expect(authCode.body.code).toBeDefined();
        });
    });

    describe('getLast5ActivitiesOfTerminal()', () => {
        it('should return last 5 activities of given terminal', async () => {
            const userId = new Types.ObjectId();
            // tslint:disable-next-line: prettier
            const activity1 = await new UserActivityLog({
                action: 'new_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T00:00:00Z'),
                terminal: 'abc',
            }).save();
            // tslint:disable-next-line: prettier
            const activity2 = await new UserActivityLog({
                action: 'new_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T00:05:00Z'),
                terminal: 'abc',
            }).save();
            // tslint:disable-next-line: prettier
            const activity3 = await new UserActivityLog({
                action: 'new_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T00:00:00Z'),
                terminal: 'def',
            }).save();
            // tslint:disable-next-line: prettier
            const activity4 = await new UserActivityLog({
                action: 'new_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T00:10:00Z'),
                terminal: 'abc',
            }).save();
            // tslint:disable-next-line: prettier
            const activity5 = await new UserActivityLog({
                action: 'new_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T00:15:00Z'),
                terminal: 'abc',
            }).save();
            // tslint:disable-next-line: prettier
            const activity6 = await new UserActivityLog({
                action: 'promo_load',
                userId,
                dateTime: new Date('2020-03-16T00:05:00Z'),
            }).save();
            // tslint:disable-next-line: prettier
            const activity7 = await new UserActivityLog({
                action: 'promo_view',
                userId,
                dateTime: new Date('2020-03-16T00:06:00Z'),
            }).save();
            // tslint:disable-next-line: prettier
            const activity8 = await new UserActivityLog({
                action: 'repeat_cust_check_in',
                userId,
                dateTime: new Date('2020-03-16T01:00:00Z'),
                terminal: 'abc',
            }).save();
            // tslint:disable-next-line: prettier
            const activity9 = await new UserActivityLog({
                action: 'redeemable_use',
                userId,
                dateTime: new Date('2020-03-16T01:05:00Z'),
                terminal: 'abc',
                redeemableId: new Types.ObjectId(),
            }).save();

            const result = await getLast5ActivitiesOfTerminal('abc');

            expect(result).toHaveLength(5);
            expect(result[0]).toMatchObject({
                activity: 'redeemable_use',
                activityRefId: activity9._id,
            });
            expect(result[1]).toMatchObject({
                activity: 'repeat_cust_check_in',
                activityRefId: activity8._id,
            });
            expect(result[2]).toMatchObject({
                activity: 'new_cust_check_in',
                activityRefId: activity5._id,
            });
            expect(result[3]).toMatchObject({
                activity: 'new_cust_check_in',
                activityRefId: activity4._id,
            });
            expect(result[4]).toMatchObject({
                activity: 'new_cust_check_in',
                activityRefId: activity2._id,
            });
        });
    });

    describe('cancelActivityFromTerminal()', () => {
        const userId = new Types.ObjectId();
        const vendorId = new Types.ObjectId();
        let customer: IVendorCustomer;
        const vendorUuid = 'bd5eab23-dd29-4a72-bcd3-e831451b71b4';

        beforeEach(async () => {
            customer = await new models.VendorCustomer({
                userId,
                vendorId,
                points: 120,
                totalPointsEarned: 200,
                totalPointsBurned: 50,
            }).save();
            await new VendorAuthClient({
                clientId: 'abc',
                vendorId,
                cardUuid: vendorUuid,
                deviceId: '123',
            }).save();
        });

        it('should reset points earned when cancelling a new-customer check-in', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.new_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            return expect(models.VendorCustomer.findById(customer._id)).resolves.toMatchObject({
                points: 110,
                totalPointsEarned: 190,
                totalPointsBurned: 50,
            });
        });

        it('should log check-in cancelled activity when cancelling a new-customer check-in', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.new_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            return expect(
                UserActivityLog.findOne({ userId, action: UserActivityAction.check_in_cancel })
            ).resolves.toMatchObject({
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                cancelledActivityId: activity._id,
            });
        });

        it('should recover original points if failed to log check-in cancelled activity when cancelling a new-customer check-in', async done => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.new_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();
            jest.spyOn(activityLog, 'logUserCheckInCancellationActivity').mockRejectedValueOnce({});

            expect(
                cancelActivityFromTerminal('abc', activity.id, vendorUuid)
            ).rejects.toMatchObject({});
            await expect(
                models.VendorCustomer.findOne({ userId, vendorId })
            ).resolves.toMatchObject({
                points: 120,
                totalPointsEarned: 200,
                totalPointsBurned: 50,
            });
            done();
        });

        it('should reset points earned when cancelling a repeat-customer check-in', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.repeat_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            await expect(models.VendorCustomer.findById(customer._id)).resolves.toMatchObject({
                points: 110,
                totalPointsEarned: 190,
                totalPointsBurned: 50,
            });
        });

        it('should log check-in cancelled activity when cancelling a repeat-customer check-in', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.repeat_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            return expect(
                UserActivityLog.findOne({ userId, action: UserActivityAction.check_in_cancel })
            ).resolves.toMatchObject({
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                cancelledActivityId: activity._id,
            });
        });

        it('should recover original points if failed to log check-in cancelled activity when cancelling a repeat-customer check-in', async done => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.repeat_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();
            jest.spyOn(activityLog, 'logUserCheckInCancellationActivity').mockRejectedValueOnce({});

            expect(
                cancelActivityFromTerminal('abc', activity.id, vendorUuid)
            ).rejects.toMatchObject({});
            await expect(
                models.VendorCustomer.findOne({ userId, vendorId })
            ).resolves.toMatchObject({
                points: 120,
                totalPointsEarned: 200,
                totalPointsBurned: 50,
            });
            done();
        });

        it('should reset points earned when cancelling a used redeemable', async () => {
            const redeemable = await new models.UserRedeemable({
                userId,
                vendorId,
                targetPoints: 5,
                redeemStatus: 'USED',
                title: 'redeemable 1',
            }).save();
            const activity = await new UserActivityLog({
                action: UserActivityAction.redeemable_use,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
                redeemableId: redeemable._id,
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            await expect(models.VendorCustomer.findById(customer._id)).resolves.toMatchObject({
                points: 130,
                totalPointsEarned: 200,
                totalPointsBurned: 40,
            });
            await expect(models.UserRedeemable.findById(redeemable._id)).resolves.toMatchObject({
                redeemStatus: 'LOCKED',
            });
        });

        it('should log redeemable cancelled activity when cancelling a used redeemable', async () => {
            const redeemable = await new models.UserRedeemable({
                userId,
                vendorId,
                targetPoints: 5,
                redeemStatus: 'USED',
                title: 'redeemable 1',
            }).save();
            const activity = await new UserActivityLog({
                action: UserActivityAction.redeemable_use,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
                redeemableId: redeemable._id,
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            return expect(
                UserActivityLog.findOne({ userId, action: UserActivityAction.redeemable_cancel })
            ).resolves.toMatchObject({
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                redeemableId: redeemable._id,
                cancelledActivityId: activity._id,
            });
        });

        it('should recover original points if failed to log redeemable cancelled activity when cancelling a used redeemable', async done => {
            const redeemable = await new models.UserRedeemable({
                userId,
                vendorId,
                targetPoints: 5,
                redeemStatus: 'USED',
                title: 'redeemable 1',
            }).save();
            const activity = await new UserActivityLog({
                action: UserActivityAction.redeemable_use,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();
            jest.spyOn(activityLog, 'logRedeemableCancellationActivity').mockRejectedValueOnce({});

            expect(
                cancelActivityFromTerminal('abc', activity.id, vendorUuid)
            ).rejects.toMatchObject({});
            await expect(models.VendorCustomer.findById(customer._id)).resolves.toMatchObject({
                points: 120,
                totalPointsEarned: 200,
                totalPointsBurned: 50,
            });
            done();
        });

        it('should ignore requests to cancel activities other than new_cust_check_in, repeat_cust_check_in and redeemable_use', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.promo_load,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();
            const customerFind = jest.spyOn(models.VendorCustomer, 'findOne');
            await expect(cancelActivityFromTerminal('abc', activity.id, vendorUuid)).resolves;

            expect(UserActivityLog.countDocuments()).resolves.toEqual(1);
            expect(customerFind).not.toHaveBeenCalled();
        });

        it('should ignore requests to cancel an already cancelled activity', async () => {
            const activity = await new UserActivityLog({
                action: UserActivityAction.repeat_cust_check_in,
                terminal: 'abc',
                points: 10,
                userId,
                vendorId,
                dateTime: new Date(),
            }).save();

            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);
            await cancelActivityFromTerminal('abc', activity.id, vendorUuid);

            await expect(models.VendorCustomer.findById(customer._id)).resolves.toMatchObject({
                points: 110,
                totalPointsEarned: 190,
                totalPointsBurned: 50,
            });
            await expect(
                UserActivityLog.count({ action: UserActivityAction.check_in_cancel })
            ).resolves.toEqual(1);
        });

        it('should return error if the given vendor card uuid is not assigned to the terminal', () => {
            expect(
                cancelActivityFromTerminal(
                    'abc',
                    new Types.ObjectId().toHexString(),
                    '38fa9d04-1677-420e-827b-2d61d97997ca'
                )
            ).rejects.toMatchObject({
                responseMsg: 'Your card is not allowed to be used in this terminal',
                errorCode: 16003,
                statusCode: 403,
            });
        });
    });

    describe('syncCheckIns(clientId: string,checkIns: [{ uuid: string; utcTimestamp: number }])', () => {
        let user1: IUser;
        let user2: IUser;
        let user3: IUser;
        let pointsScheme: IVendorPointsScheme;
        let vendor: IVendor;
        let customer: IVendorCustomer;

        const clientId = 'xx-client-id';

        const uuids = [
            'adac5c25-ec05-48b6-c32c-8ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
            'cdac5c25-ec05-46b6-a32c-6ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
        ];

        const utcTimestamps = [
            1584400000000,
            1584400115000, // + 115 000
            1584400315000, // + 200 000
            1584400515000, // + 200 000
            1584400600000, // + 085 000
        ];

        const correctCheckInUtcTimestamps = [
            '1584400000000',
            '1584400115000', // + 115 000
            '1584400315000', // + 200 000
            '1584400515000', // + 200 000
        ];

        const checkIns: Array<{
            uuid: string;
            utcTimestamp: number;
            cancelled: boolean;
            cancelledId: number;
        }> = [];

        beforeEach(async () => {
            try {
                user1 = await new User({
                    deviceId: '3',
                    mobileNumber: '1234455667',
                    name: 'Amal Perera',
                    roles: ['APP_USER'],
                    uuid: uuids[0],
                }).save();

                user2 = await new User({
                    deviceId: '2',
                    mobileNumber: '1234455668',
                    name: 'Mal Perera',
                    roles: ['APP_USER'],
                    uuid: uuids[1],
                }).save();

                user3 = await new User({
                    deviceId: '1',
                    mobileNumber: '1234455669',
                    name: 'Amal Rera',
                    roles: ['APP_USER'],
                    uuid: uuids[2],
                }).save();

                vendor = await new Vendor({
                    givenName: 'Burger King',
                    thumbnailImage: 'thumburl',
                    terminalImage: 'terminalurl',
                    pin: '11111',
                    storageBucket: 'bucket',
                }).save();

                const terminal = await new VendorAuthClient({
                    vendorId: vendor._id,
                    cardUuid: 'c4bd416f-8744-46fa-9a20-991b0d3d4511',
                    deviceId: 'abc',
                    clientId,
                }).save();

                pointsScheme = await new VendorPointsScheme({
                    vendorId: vendor._id,
                    type: 'FIXED',
                    default: true,
                    fixed: 5,
                    checkinIntervelInSeconds: 120,
                }).save();

                customer = await new models.VendorCustomer({
                    userId: user3._id,
                    vendorId: vendor._id,
                    points: 120,
                    totalPointsEarned: 200,
                    totalPointsBurned: 50,
                }).save();

                for (let index = 0; index < uuids.length; index++) {
                    const _uuid = uuids[index];
                    const utcTimestamp = utcTimestamps[index];
                    checkIns.push({
                        uuid: _uuid,
                        utcTimestamp,
                        cancelled: false,
                        cancelledId: null,
                    });
                }
            } catch (err) {
                // tslint:disable-next-line: no-console
                console.error(err);
            }
        });

        it('should sync valid check-ins and remove invalid check-ins; ', async () => {
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, checkIns);

            expect(results.length).toEqual(5);

            const successLogs = results.filter(el => {
                return el.error === null;
            });

            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < successLogs.length; index++) {
                const log = successLogs[index];
                expect(log.uploaded).toEqual(true);
                expect(correctCheckInUtcTimestamps.includes(log.utcTimestamp.toString())).toEqual(
                    true
                );
            }

            const errorLogs = results.filter(el => {
                return el.error != null;
            });

            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < errorLogs.length; index++) {
                const log = errorLogs[index];
                expect(log.uploaded).toEqual(false);
                expect(correctCheckInUtcTimestamps.includes(log.utcTimestamp.toString())).toEqual(
                    false
                );
                expect(log.error).toBe('duplicate'); // 'no user for uuid'
            }
        });

        it('should sync valid check-ins and record UserActivityLogs ; ', async () => {
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
            }> = await syncCheckIns(clientId, checkIns);

            const activityLog1 = await models.UserActivityLog.findOne({
                userId: user1._id,
                timestampMillis: correctCheckInUtcTimestamps[0],
            });

            expect(activityLog1.action).toEqual(UserActivityAction.new_cust_check_in);
            expect(activityLog1.points).toEqual(5);

            const activityLog2 = await models.UserActivityLog.findOne({
                userId: user2._id,
                timestampMillis: correctCheckInUtcTimestamps[1],
            });

            expect(activityLog2.action).toEqual(UserActivityAction.new_cust_check_in);
            expect(activityLog2.points).toEqual(5);

            const activityLog3 = await models.UserActivityLog.findOne({
                userId: user3._id,
                timestampMillis: correctCheckInUtcTimestamps[2],
            });

            expect(activityLog3.action).toEqual(UserActivityAction.repeat_cust_check_in);
            expect(activityLog3.points).toEqual(5);

            const activityLog4 = await models.UserActivityLog.findOne({
                userId: user2._id,
                timestampMillis: correctCheckInUtcTimestamps[3],
            });

            expect(activityLog4.action).toEqual(UserActivityAction.repeat_cust_check_in);
            expect(activityLog4.points).toEqual(5);
        });

        it('should sync valid check-ins and add points, totalPointsEarned to existing vendor customer', async () => {
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
            }> = await syncCheckIns(clientId, checkIns);

            const existedVendorCustomer = await models.VendorCustomer.findById(customer._id);

            expect(existedVendorCustomer.points).toEqual(125);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(205);
        });

        it('should sync valid check-ins and add vendor customers for new check ins', async () => {
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
            }> = await syncCheckIns(clientId, checkIns);

            const existedVendorCustomer1 = await models.VendorCustomer.findOne({
                userId: user1._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer1.points).toEqual(5);
            expect(existedVendorCustomer1.totalPointsEarned).toEqual(5);

            const existedVendorCustomer2 = await models.VendorCustomer.findOne({
                userId: user2._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer2.points).toEqual(10);
            expect(existedVendorCustomer2.totalPointsEarned).toEqual(10);
        });

        it('should revert ckeck ins failed on SyncCheckIns', async () => {
            const _checkIns: Array<{
                uuid: string;
                utcTimestamp: number;
                cancelled: boolean;
                cancelledId: number;
            }> = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400400002,
                    cancelledId: null,
                    cancelled: false,
                },
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400400003,
                    cancelledId: null,
                    cancelled: false,
                },
            ];

            jest.spyOn(activityLog, 'logCustomerCheckInActivity').mockImplementation(() => {
                throw new BadRequestError('UserActivityLog not updated');
            });

            await expect(syncCheckIns(clientId, _checkIns)).rejects.toMatchObject({
                message: 'UserActivityLog not updated',
                statusCode: 400,
            });

            const existedVendorCustomer1 = await models.VendorCustomer.findOne({
                userId: user1._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer1.points).toEqual(0);
            expect(existedVendorCustomer1.totalPointsEarned).toEqual(0);
        });
    });

    describe('cancel check in: syncCheckIns(clientId: string,checkIns: [{ uuid: string; utcTimestamp: number }])', () => {
        let user1: IUser;
        let user2: IUser;
        let pointsScheme: IVendorPointsScheme;
        let vendor: IVendor;
        let customer: IVendorCustomer;

        const clientId = 'xx-client-id';

        const uuids = [
            'adac5c25-ec05-48b6-c32c-8ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
            'bdac5c25-ec05-47b6-b32c-7ea17377e31e',
        ];
        const correctCheckInUtcTimestamps = [
            '1584400000000',
            '1584400115000', // + 115 000
            '1584400315000', // + 200 000
            '1584400515000', // + 200 000
        ];

        const checkIns: Array<{
            uuid: string;
            utcTimestamp: number;
            cancelled: boolean;
            cancelledId: number;
        }> = [];

        beforeEach(async () => {
            try {
                user1 = await new User({
                    deviceId: '3',
                    mobileNumber: '1234455667',
                    name: 'Amal Perera',
                    roles: ['APP_USER'],
                    uuid: uuids[0],
                }).save();

                user2 = await new User({
                    deviceId: '2',
                    mobileNumber: '1234455668',
                    name: 'Mal Perera',
                    roles: ['APP_USER'],
                    uuid: uuids[1],
                }).save();

                vendor = await new Vendor({
                    givenName: 'Burger King',
                    thumbnailImage: 'thumburl',
                    terminalImage: 'terminalurl',
                    pin: '11111',
                    storageBucket: 'bucket',
                }).save();

                const terminal = await new VendorAuthClient({
                    vendorId: vendor._id,
                    cardUuid: 'c4bd416f-8744-46fa-9a20-991b0d3d4511',
                    deviceId: 'abc',
                    clientId,
                }).save();

                pointsScheme = await new VendorPointsScheme({
                    vendorId: vendor._id,
                    type: 'FIXED',
                    default: true,
                    fixed: 5,
                    checkinIntervelInSeconds: 120,
                }).save();

                customer = await new models.VendorCustomer({
                    userId: user1._id,
                    vendorId: vendor._id,
                    points: 120,
                    totalPointsEarned: 200,
                    totalPointsBurned: 50,
                }).save();

                await syncCheckIns(clientId, [
                    {
                        uuid: uuids[0],
                        utcTimestamp: 1584400000001,
                        cancelledId: null,
                        cancelled: false,
                    },
                    {
                        uuid: uuids[1],
                        utcTimestamp: 1584400200001,
                        cancelledId: null,
                        cancelled: false,
                    },
                    {
                        uuid: uuids[0],
                        utcTimestamp: 1584480000001,
                        cancelledId: null,
                        cancelled: false,
                    },
                ]);
            } catch (err) {
                // tslint:disable-next-line: no-console
                console.error(err);
            }
        });

        it('should return error given checkIns are not existed', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400200001, // invalid checkin id
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200010,
                    cancelledId: 1584411200001, // invalid checkin id
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200111,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
            ];

            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancel);
            expect(results.length).toEqual(3);

            const previousCheckInLog = await models.UserActivityLog.findOne({
                timestampMillis: 1584400200001,
                userId: user2._id,
            });
            expect(previousCheckInLog.cancelled).toEqual(true);
            expect(previousCheckInLog.action).toEqual(UserActivityAction.new_cust_check_in);
            expect(previousCheckInLog.cancelledTimestampMillis.toNumber()).toEqual(1584400200111);

            const existedVendorCustomer = await models.VendorCustomer.findOne({
                userId: user2._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer.points).toEqual(0);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(0);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });
            expect(errorLogs.length).toEqual(2);

            const log = errorLogs[0];
            expect(log.utcTimestamp).toEqual(1584400200000);
            expect(log.uploaded).toEqual(false);
            expect(log.error).toBe('invalid cancel attempt');

            const log1 = errorLogs[1];
            expect(log1.utcTimestamp).toEqual(1584400200010);
            expect(log1.uploaded).toEqual(false);
            expect(log1.error).toBe('invalid cancel attempt');
        });

        it('should return error given client id is null', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200011,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
            ];
            await expect(syncCheckIns(null, _checkInsForCancel)).rejects.toMatchObject({
                message: 'Missing parameter: `clientId`',
                errorCode: 11005,
                statusCode: 400,
            });
        });

        it('should return error given client id is invalid', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200011,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
            ];
            await expect(syncCheckIns('1', _checkInsForCancel)).rejects.toMatchObject({
                message: 'Invalid client',
                errorCode: ErrorCodes.AUTH_CLIENT_CREDENTIAL_INVALID,
                statusCode: 400,
            });
        });

        it('should return error given checkIns are null', async () => {
            await expect(syncCheckIns(clientId, null)).rejects.toMatchObject({
                message: 'Missing parameter: checkIns `[{ uuid: string; utcTimestamp: number }]`',
                errorCode: 17002,
                statusCode: 400,
            });
        });

        it('should ignore for incorrect consumer uuids and proceed correct ids', async () => {
            const _checkInsForCancel = [
                {
                    uuid: 'c3bd416f-8744-46fa-9a20-991b0d3d4511',
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200011,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
            ];
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancel);
            expect(results.length).toEqual(2);

            const previousCheckInLog = await models.UserActivityLog.findOne({
                timestampMillis: 1584400200001,
                userId: user2._id,
            });
            expect(previousCheckInLog.cancelled).toEqual(true);
            expect(previousCheckInLog.action).toEqual(UserActivityAction.new_cust_check_in);
            expect(previousCheckInLog.cancelledTimestampMillis.toNumber()).toEqual(1584400200011);

            const existedVendorCustomer = await models.VendorCustomer.findOne({
                userId: user2._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer.points).toEqual(0);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(0);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });
            expect(errorLogs.length).toEqual(1);

            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < errorLogs.length; index++) {
                const log = errorLogs[index];
                expect(log.utcTimestamp).toEqual(1584400200000);
                expect(log.uploaded).toEqual(false);
                expect(log.error).toBe('no user for uuid'); // 'no user for uuid'
            }
        });

        it('should cancel new-customer check-in', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
                {
                    uuid: uuids[1],
                    utcTimestamp: 1584400200011,
                    cancelledId: 1584400200001,
                    cancelled: false,
                },
            ];
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancel);
            expect(results.length).toEqual(2);

            const previousCheckInLog = await models.UserActivityLog.findOne({
                timestampMillis: 1584400200001,
                userId: user2._id,
            });
            expect(previousCheckInLog.cancelled).toEqual(true);
            expect(previousCheckInLog.action).toEqual(UserActivityAction.new_cust_check_in);
            expect(previousCheckInLog.cancelledTimestampMillis.toNumber()).toEqual(1584400200000);

            const existedVendorCustomer = await models.VendorCustomer.findOne({
                userId: user2._id,
                vendorId: vendor._id,
            });
            expect(existedVendorCustomer.points).toEqual(0);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(0);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });

            expect(errorLogs.length).toEqual(1);

            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < errorLogs.length; index++) {
                const log = errorLogs[index];
                expect(log.utcTimestamp).toEqual(1584400200011);
                expect(log.uploaded).toEqual(false);
                expect(log.error).toBe('invalid cancel attempt'); // 'no user for uuid'
            }
        });

        it('should cancel repeat-customer check-in', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584400000001,
                    cancelled: false,
                },
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400200011,
                    cancelledId: 1584400000001,
                    cancelled: false,
                },
            ];

            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancel);

            const previousCheckInLog = await models.UserActivityLog.findOne({
                timestampMillis: 1584400000001,
                userId: user1._id,
            });
            expect(previousCheckInLog.cancelled).toEqual(true);
            expect(previousCheckInLog.action).toEqual(UserActivityAction.repeat_cust_check_in);
            expect(previousCheckInLog.cancelledTimestampMillis.toNumber()).toEqual(1584400200000);

            const existedVendorCustomer = await models.VendorCustomer.findById(customer._id);

            expect(existedVendorCustomer.points).toEqual(125);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(205);

            expect(results.length).toEqual(2);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });

            expect(errorLogs.length).toEqual(1);

            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < errorLogs.length; index++) {
                const log = errorLogs[index];
                expect(log.utcTimestamp).toEqual(1584400200011);
                expect(log.uploaded).toEqual(false);
                expect(log.error).toBe('invalid cancel attempt'); // 'no user for uuid'
            }
        });

        it('should not cancel same check-in again', async () => {
            const _checkInsForCancel = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400200000,
                    cancelledId: 1584480000001,
                    cancelled: false,
                },
            ];

            const r = await syncCheckIns(clientId, _checkInsForCancel);
            const _checkInsForCancelAgain = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400400002,
                    cancelledId: 1584480000001,
                    cancelled: false,
                },
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400500002,
                    cancelledId: 1584400000001,
                    cancelled: false,
                },
            ];
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancelAgain);
            expect(results.length).toEqual(2);

            const existedVendorCustomer = await models.VendorCustomer.findById(customer._id);

            expect(existedVendorCustomer.points).toEqual(120);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(200);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });
            expect(errorLogs.length).toEqual(1);
            // tslint:disable-next-line: prefer-for-of
            for (let index = 0; index < errorLogs.length; index++) {
                const log = errorLogs[index];
                expect(log.utcTimestamp).toEqual(1584400400002);
                expect(log.uploaded).toEqual(false);
                expect(log.error).toBe('invalid cancel attempt'); // 'no user for uuid'
            }
        });

        it('should not consider timestamp difference for cancel check in', async () => {
            const _checkInsForCancelAgain = [
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400400002,
                    cancelledId: 1584480000001,
                    cancelled: false,
                },
                {
                    uuid: uuids[0],
                    utcTimestamp: 1584400400003,
                    cancelledId: 1584400000001,
                    cancelled: false,
                },
            ];
            const results: Array<{
                utcTimestamp: number;
                uploaded: boolean;
                error: string;
            }> = await syncCheckIns(clientId, _checkInsForCancelAgain);
            expect(results.length).toEqual(2);

            const existedVendorCustomer = await models.VendorCustomer.findById(customer._id);

            expect(existedVendorCustomer.points).toEqual(120);
            expect(existedVendorCustomer.totalPointsEarned).toEqual(200);

            const errorLogs = results.filter(el => {
                return el.error != null;
            });
            expect(errorLogs.length).toEqual(0);
        });
    });
});

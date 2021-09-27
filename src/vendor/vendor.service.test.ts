import { Types } from 'mongoose';
import uuid = require('uuid');
import validate = require('uuid-validate');
import models from '../models';
import { User } from '../models/user';
import { IVendor, Vendor, VendorPointSchemeType } from '../models/vendor';
import { VendorCard } from '../models/vendor-cards';
import { VendorManager } from '../models/vendor-manager';
import {
    createCardsForVendor,
    createVendor,
    getVendorProfile,
    getVendorWebPortalConfig,
} from './vendor.service';
import { VendorOpts } from './VendorOpts';

describe('VendorService', () => {
    describe('createCardsForVendor()', () => {
        it('should create and return given number of uuids for vendor cards', async () => {
            const vendorId = new Types.ObjectId();

            const result = await createCardsForVendor(vendorId.toHexString(), 4);

            expect(result.length).toBe(4);
            result.forEach(val => {
                expect(validate(val, 4)).toBeTruthy();
            });
            return expect(VendorCard.find({ vendorId })).resolves.toHaveLength(4);
        });

        it('should create and return unique uuids', async () => {
            const vendorId = new Types.ObjectId();
            jest.spyOn(uuid, 'v4').mockReturnValueOnce('15d7733a-6fb2-4cb6-88fd-7065804abc6d');
            await new VendorCard({
                vendorId,
                uuid: '15d7733a-6fb2-4cb6-88fd-7065804abc6d',
            }).save();

            const result = await createCardsForVendor(vendorId.toHexString(), 3);

            expect(result.length).toBe(3);
            expect(result).not.toContain('15d7733a-6fb2-4cb6-88fd-7065804abc6d');
        });

        it('should return empty array if failed to create unique uuids', async () => {
            const vendorId = new Types.ObjectId();
            jest.spyOn(uuid, 'v4').mockReturnValue('15d7733a-6fb2-4cb6-88fd-7065804abc6d');
            await new VendorCard({
                vendorId,
                uuid: '15d7733a-6fb2-4cb6-88fd-7065804abc6d',
            }).save();

            const result = await createCardsForVendor(vendorId.toHexString(), 2);

            expect(result.length).toBe(0);
        });

        it('should only add given number of cards to a vendor', async () => {
            const vendorId = new Types.ObjectId();
            jest.spyOn(uuid, 'v4')
                .mockReturnValueOnce('db9bb932-7d2e-464a-8245-87ece8ded33d')
                .mockReturnValueOnce('15d7733a-6fb2-4cb6-88fd-7065804abc6d')
                .mockReturnValueOnce('d2b3a234-d03d-4718-b588-99c0efb1c004')
                .mockReturnValueOnce('5360d48b-4470-40ce-99ff-6e0d0b5a4a1f');
            await new VendorCard({
                vendorId,
                uuid: '15d7733a-6fb2-4cb6-88fd-7065804abc6d',
            }).save();

            const result = await createCardsForVendor(vendorId.toHexString(), 2);

            expect(result).toMatchObject([
                'db9bb932-7d2e-464a-8245-87ece8ded33d',
                'd2b3a234-d03d-4718-b588-99c0efb1c004',
            ]);
            return expect(VendorCard.find()).resolves.toHaveLength(3);
        });

        it('should return all the uuids created within 5 retries even if it is less than the requested cards', async () => {
            const vendorId = new Types.ObjectId();
            jest.spyOn(uuid, 'v4')
                .mockReturnValueOnce('db9bb932-7d2e-464a-8245-87ece8ded33d')
                .mockReturnValue('15d7733a-6fb2-4cb6-88fd-7065804abc6d');
            await new VendorCard({
                vendorId,
                uuid: '15d7733a-6fb2-4cb6-88fd-7065804abc6d',
            }).save();

            const result = await createCardsForVendor(vendorId.toHexString(), 2);

            expect(result).toEqual(['db9bb932-7d2e-464a-8245-87ece8ded33d']);
            return expect(VendorCard.find()).resolves.toHaveLength(2);
        });
    });

    describe('createVendor()', () => {
        it('should throw error when trying to create vendor without a point scheme', async () => {
            const data = {
                givenName: 'Game Kade',
            } as VendorOpts;

            expect(createVendor(data)).rejects.toMatchObject({
                message: 'Missing parameter: `pointSchemes`',
                errorCode: 18001,
            });
        });

        it('should create vendor with given details and point schemes', async () => {
            const data: VendorOpts = {
                givenName: 'Game Kade',
                fullName: 'Game Kade Pvt Ltd',
                thumbnailImage: 'img',
                terminalImage: 'img',
                storageBucket: 'bucket',
                pointSchemes: [
                    {
                        type: 'FIXED',
                        value: 10,
                    },
                    {
                        type: 'PERCENT_OF_BILL',
                        value: 0.5,
                    },
                ],
            };

            const vendor = await createVendor(data);

            const saved = await Vendor.findById(new Types.ObjectId(vendor.id));
            expect(vendor.id).not.toBeNull();
            expect(saved).toMatchObject({
                givenName: 'Game Kade',
                fullName: 'Game Kade Pvt Ltd',
                thumbnailImage: 'img',
                terminalImage: 'img',
                storageBucket: 'bucket',
                pin: undefined,
            });
            expect(saved.pointSchemes.get('s0')).toMatchObject({
                type: 'FIXED',
                fixed: 10,
            });
            expect(saved.pointSchemes.get('s1')).toMatchObject({
                type: 'PERCENT_OF_BILL',
                percentageOfBillValue: 0.5,
            });
        });

        it('should throw error if vendor point scheme type is not in VendorPointSchemeType', async () => {
            const data: VendorOpts = {
                givenName: 'Game Kade',
                fullName: 'Game Kade Pvt Ltd',
                thumbnailImage: 'img',
                terminalImage: 'img',
                storageBucket: 'bucket',
                pointSchemes: [
                    {
                        type: 'unknown',
                        value: 10,
                    },
                ],
            };

            expect(createVendor(data)).rejects.toMatchObject({
                message: 'Invalid parameter: `pointSchems.type`',
                errorCode: 18001,
            });
        });
    });

    describe('getVendorProfile()', () => {
        it('should get available vendor details', async () => {
            let vendor = {
                givenName: 'abc',
                fullName: 'ABC',
                thumbnailImage: 'img1',
                terminalImage: 'img2',
                storageBucket: 'bucket',
                pointSchemes: new Map<string, any>(),
            } as IVendor;
            vendor.pointSchemes.set('s0', {
                type: VendorPointSchemeType.FIXED,
                fixed: 20,
            });
            vendor = await new Vendor(vendor).save();

            return expect(getVendorProfile(vendor.id)).resolves.toMatchObject({
                givenName: 'abc',
                fullName: 'ABC',
                thumbnailImage: 'img1',
                terminalImage: 'img2',
                storageBucket: 'bucket',
                pointSchemes: [
                    {
                        type: 'FIXED',
                        value: 20,
                    },
                ],
            });
        });
    });

    describe('getVendorWebPortalConfig()', () => {
        it('should return web portal config for the authenticated user', async () => {
            const portalUser = await new User({
                username: 'kamal',
                password: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
                roles: ['PORTAL_USER'],
                name: 'Kamal Perera',
                uuid: 'deca3229-8e12-4e7c-87a7-fb4cb8be3a76',
            }).save();
            const vendor = await new Vendor({
                givenName: 'Victon',
                thumbnailImage: 'img',
                terminalImage: 'img',
                storageBucket: 'bucket',
            }).save();
            await new VendorManager({
                userId: portalUser._id,
                vendorId: vendor._id,
            }).save();

            return expect(
                getVendorWebPortalConfig('deca3229-8e12-4e7c-87a7-fb4cb8be3a76')
            ).resolves.toMatchObject({
                user: {
                    name: 'Kamal Perera',
                },
                vendor: {
                    id: vendor.id,
                    name: 'Victon',
                },
            });
        });
    });
});

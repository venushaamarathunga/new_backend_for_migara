import { ObjectId } from 'bson';
import models from '../models';
import { OAuthClient } from '../models/oauth-client';
import { GENDER, IUser, User } from '../models/user';
import UserActivityLog from '../models/user-activity-log';
import { IUserUuid } from '../models/user-uuid';
import { IVendor, Vendor } from '../models/vendor';
import { VendorAuthClient } from '../models/vendor-auth-client';
import { messageSend } from '../notification/smspublish';
import { NewUser } from './NewUser';
import {
    calculateDobAndGender,
    checkInUser,
    createUser,
    getUserByUuid,
    getUserProfile,
    updateUserNic,
} from './user.service';

describe('User Service', () => {
    describe('checkInUser()', () => {
        let user: IUser;
        let vendor: IVendor;

        beforeEach(async () => {
            user = await new User({
                deviceId: 'default',
                mobileNumber: '12345',
                name: 'Amal Perera',
                roles: ['MINICARD_USER'],
                uuid: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
            }).save();
            vendor = await new Vendor({
                givenName: 'ABC',
                thumbnailImage: 'img',
                terminalImage: 'timg',
                storageBucket: 'bucket',
                pin: '11111',
            }).save();
            await new VendorAuthClient({
                clientId: 'client1',
                vendorId: vendor._id,
                cardUuid: '123',
                deviceId: 'abc',
            }).save();
        });

        it('should return error if given uuid is not in uuid format on checkInUser', async done => {
            const checkinPromise = checkInUser('something', 'client1', 1584527713600);

            expect(checkinPromise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 13001,
            });
            done();
        });

        it('should return error if clientId is not given on checkInUser', async done => {
            const checkinPromise = checkInUser(
                '9a23e27b-b6a1-49f6-bac3-80b73fde9f77',
                null,
                1584527713600
            );

            expect(checkinPromise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 11005,
            });
            done();
        });

        it('should return error if a user does not exist for given uuid on checkInUser', async () => {
            const checkinPromise = checkInUser(
                '9a23e27b-b6a1-49f6-bac3-80b73fde9f77',
                'client1',
                1584527713600
            );

            expect(checkinPromise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 13001,
            });
        });

        it('should return error if the given client id is not registered under a vendor on checkInUser', async () => {
            const checkinPromise = checkInUser(
                'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                'client2',
                1584527713600
            );

            expect(checkinPromise).rejects.toMatchObject({
                statusCode: 400,
                errorCode: 12007,
            });
        });

        it('should add customer to vendor if the user is a new customer of vendor on checkInUser', async done => {
            await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();
            expect(
                models.VendorCustomer.findOne({
                    userId: user._id,
                    vendorId: vendor._id,
                })
            ).resolves.toBeNull();

            await checkInUser('bdac5c25-ec05-47b6-a32c-6ea17377e31e', 'client1', 1584527713600);

            await expect(
                models.VendorCustomer.findOne({
                    userId: user._id,
                    vendorId: vendor._id,
                })
            ).resolves.toMatchObject({
                points: 5,
                totalPointsEarned: 5,
                totalPointsBurned: 0,
            });
            done();
        });

        it('should update the customer points if he is a registered customer under the vendor on checkInUser', async done => {
            const scheme = await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();
            await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                points: 10,
                totalPointsEarned: 20,
                pointsSchemeId: scheme._id,
            }).save();

            await checkInUser('bdac5c25-ec05-47b6-a32c-6ea17377e31e', 'client1', 1584527713600);

            await expect(
                models.VendorCustomer.findOne({
                    userId: user._id,
                    vendorId: vendor._id,
                })
            ).resolves.toMatchObject({
                points: 15,
                totalPointsEarned: 25,
                totalPointsBurned: 0,
            });
            done();
        });

        it('should not add points to user if a points scheme is not available for the vendor on checkInUser', async done => {
            await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                points: 10,
            }).save();

            await checkInUser('bdac5c25-ec05-47b6-a32c-6ea17377e31e', 'client1', 1584527713600);

            await expect(
                models.VendorCustomer.findOne({
                    userId: user._id,
                    vendorId: vendor._id,
                })
            ).resolves.toMatchObject({
                points: 10,
            });
            done();
        });

        it('should track new customer check in activity on checkInUser', async done => {
            await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();

            await checkInUser('bdac5c25-ec05-47b6-a32c-6ea17377e31e', 'client1', 1584527713600);

            await expect(UserActivityLog.findOne({ userId: user._id })).resolves.toMatchObject({
                action: 'new_cust_check_in',
                vendorId: vendor._id,
                terminal: 'client1',
                points: 5,
            });
            done();
        });

        it('should track repeat customer check in activity on checkInUser', async done => {
            const scheme = await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();
            await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                points: 10,
                totalPointsEarned: 20,
                pointsSchemeId: scheme._id,
            }).save();

            await checkInUser('bdac5c25-ec05-47b6-a32c-6ea17377e31e', 'client1', 1584527713600);

            await expect(UserActivityLog.findOne({ userId: user._id })).resolves.toMatchObject({
                action: 'repeat_cust_check_in',
                vendorId: vendor._id,
                terminal: 'client1',
                points: 5,
            });
            done();
        });

        it('should set isNewUser = true if the user is a new customer of vendor on checkInUser', async () => {
            await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();
            expect(
                models.VendorCustomer.findOne({
                    userId: user._id,
                    vendorId: vendor._id,
                })
            ).resolves.toBeNull();

            const profile: any = await checkInUser(
                'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                'client1',
                1584527713600
            );
            expect(profile.isNewCustomer).toEqual(true);
        });

        it('should set isNewUser = false if he is a registered customer under the vendor on checkInUser', async () => {
            const scheme = await new models.VendorPointsScheme({
                vendorId: vendor._id,
                type: 'FIXED',
                fixed: 5,
                default: true,
            }).save();
            await new models.VendorCustomer({
                userId: user._id,
                vendorId: vendor._id,
                points: 10,
                totalPointsEarned: 20,
                pointsSchemeId: scheme._id,
            }).save();

            const profile: any = await checkInUser(
                'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                'client1',
                1584527713600
            );
            expect(profile.isNewUser).toEqual(undefined);
        });
    });

    describe('getUserProfile()', () => {
        it('should get user profile details when redeemableItems is true in getUserProfile', async () => {
            const userUUID = '7495ebd0-f83b-4959-a650-d3a0a13360bd';
            const redeemableItem: boolean = true;
            const registeredShop: boolean = false;

            const registeredShopDetails: any[] = [];

            const user = {
                _id: new ObjectId('5dd4f4af7ecd5c7f37548776'),
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                name: 'Kamal',
                roles: ['PORTAL_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
            };

            const redeemableItemDetails = [
                {
                    _id: new ObjectId('5e01c889da30a63504db543a'),
                    userId: new ObjectId('5dd4f4af7ecd5c7f37548776'),
                    vendorId: new ObjectId('5dd7884e7ecd5c7f37548f09'),
                    thumbnailImageUrl:
                        'https://www.google.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34fna4fwvvO275hx41JI7PoZ7Dw:1577175249339&tbm=isch&source=iu&ictx=1&fir=zXwrfQvPsQ5dwM%253A%252CShwNVOdFBcmkxM%252C_&vet=1&usg=AI4_-kRfetVW6X9jb1moRFiMpyFoJA8UsA&sa=X&ved=2ahUKEwj5ufDT683mAhUC6nMBHX',
                    imageUrls: [
                        'https://www.google.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34fna4fwvvO275hx41JI7PoZ7Dw:1577175249339&tbm=isch&source=iu&ictx=1&fir=zXwrfQvPsQ5dwM%253A%252CShwNVOdFBcmkxM%252=X&ved=2ahUKEwj5ufDT683mAhUC6nMBHX_LCkoQ9QEwAHoECAoQLw#imgrc=tUWsPKGJuIoBeM:&vet=1',
                    ],
                    title: 'brief Description  test',
                    targetPoints: 20,
                    description: 'detailed Description test',
                    expiryDate: new Date('2011-10-05T14:48:00.000Z'),
                    redeemStatus: 'LOCKED',
                },
            ];

            await models.UserRedeemable.insertMany(redeemableItemDetails);
            await User.insertMany([user]);
            await models.VendorCustomer.insertMany([
                {
                    userId: new ObjectId('5dd4f4af7ecd5c7f37548776'),
                    vendorId: new ObjectId('5dd7884e7ecd5c7f37548f09'),
                },
            ]);

            const userProfile = await getUserProfile(userUUID, redeemableItem, registeredShop);

            expect(userProfile.id).toMatch('7495ebd0-f83b-4959-a650-d3a0a13360bd');
            expect(userProfile.name).toMatch(user.name);
            for (let i = 0; i < redeemableItemDetails.length; i++) {
                expect(userProfile.redeemableItems[i].thumbnailImageUrl).toEqual(
                    redeemableItemDetails[i].thumbnailImageUrl
                );
                expect(userProfile.redeemableItems[i].imageUrls).toEqual(
                    redeemableItemDetails[i].imageUrls
                );
                expect(userProfile.redeemableItems[i].title).toEqual(
                    redeemableItemDetails[i].title
                );
                expect(userProfile.redeemableItems[i].description).toEqual(
                    redeemableItemDetails[i].description
                );
                expect(userProfile.redeemableItems[i].targetPoints).toEqual(20);
                expect(userProfile.redeemableItems[i].expiryDate).toEqual(
                    redeemableItemDetails[i].expiryDate
                );
                expect(userProfile.redeemableItems[i].redeemStatus).toEqual(
                    redeemableItemDetails[i].redeemStatus
                );
            }
            expect(userProfile.registeredShops).toEqual(registeredShopDetails);
        }, 20000);

        it('should get user profile details when registeredShops is true in getUserprofile', async () => {
            const userUUID = '7495ebd0-f83b-4959-a650-d3a0a13360bd';
            const redeemableItem: boolean = false;
            const registeredShop: boolean = true;

            const redeemableItemDetails: any[] = [];

            const user = {
                _id: new ObjectId('5dbf2de6165f125978fc9d3d'),
                uuid: '7495ebd0-f83b-4959-a650-d3a0a13360bd',
                name: 'Kamal',
                roles: ['APP_USER'],
                mobileNumber: '0713930576',
                deviceId: 'ehEBrp_gc9g',
            };

            const vendors = [
                {
                    _id: new ObjectId('5dd7884e7ecd5c7f37548f09'),
                    givenName: 'KFC',
                    thumbnailImage: 'Thumbnail Image KFC',
                    terminalImage: 'timg',
                    storageBucket: 'bucket',
                    pin: '11111',
                },
            ];

            const vendorCustomer = {
                _id: new ObjectId('5dd7ad3f7ecd5c7f375497a5'),
                userId: new ObjectId('5dbf2de6165f125978fc9d3d'),
                vendorId: new ObjectId('5dd7884e7ecd5c7f37548f09'),
            };

            const unreadNotifCountNotView = [
                {
                    _id: new ObjectId('5e05fd678a3bdc13700756b9'),
                    viewStatus: 'NOT_VIEWED',
                    userId: new ObjectId('5dbf2de6165f125978fc9d3d'),
                    vendorId: new ObjectId('5dd7884e7ecd5c7f37548f09'),
                    promotionId: new ObjectId('5e05fd638a3bdc13700756b8'),
                    messageId: '0:1577450856209138%208877f5208877f5',
                    success: true,
                },
            ];

            await User.insertMany([user]);
            await models.VendorCustomer.insertMany([vendorCustomer]);
            await Vendor.insertMany(vendors);
            await models.UserInAppNotification.insertMany(unreadNotifCountNotView);

            const userProfile = await getUserProfile(userUUID, redeemableItem, registeredShop);

            expect(userProfile.id).toMatch('7495ebd0-f83b-4959-a650-d3a0a13360bd');
            expect(userProfile.name).toMatch(user.name);

            for (let i = 0; i < vendors.length; i++) {
                expect(userProfile.registeredShops[i].name).toEqual(vendors[i].givenName);
                expect(userProfile.registeredShops[i].thumbnailImage).toEqual(
                    'https://storage.googleapis.com/bucket/Thumbnail Image KFC'
                );
            }
            for (let i = 0; i < vendors.length; i++) {
                expect(userProfile.registeredShops[i].unreadNotifCount).toEqual(1);
            }

            expect(userProfile.redeemableItems).toEqual(redeemableItemDetails);
        }, 20000);
    });

    describe('createUser()', () => {
        let smsPublishSpy: jest.SpyInstance;
        beforeEach(() => {
            smsPublishSpy = jest.spyOn(messageSend, 'messagePublish');
        });

        it('should create new unverified user when called without id in payload', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();

            await createUser({
                challenge: 'challenge',
                clientId: 'terminal1',
                deviceId: 'qazwsxedc',
                mobileNumber: '0798765432',
                name: 'Eunkwang',
            } as NewUser);

            const unverifiedUser = await models.UnverifiedUser.findOne({
                mobileNumber: '0798765432',
            });
            expect(unverifiedUser).not.toBeNull();
            expect(unverifiedUser.accessType).toEqual('app');
            expect(unverifiedUser.name).toEqual('Eunkwang');
            expect(unverifiedUser.challenge).toEqual('challenge');
            expect(unverifiedUser.uuid).not.toBeNull();
            expect(unverifiedUser.deviceId).toEqual('qazwsxedc');

            const uuid = await models.IssuedUuid.findOne({ uuid: unverifiedUser.uuid });
            expect(uuid).toBeDefined();
            expect(uuid.usedIn).toEqual('app');
        });

        it('should send a sms with verification code to created unverified user when called without id in payload', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();

            await createUser({
                challenge: 'challenge',
                clientId: 'terminal1',
                deviceId: 'qazwsxedc',
                mobileNumber: '0798765432',
                name: 'Peniel',
            } as NewUser);

            const unverifiedUser = await models.UnverifiedUser.findOne({
                mobileNumber: '0798765432',
            });
            expect(smsPublishSpy).toHaveBeenCalledWith(
                `0798765432,Your Flava verification code is <${unverifiedUser.verificationCode}>,`
            );
        });

        it('should throw error if an app user has already registered for the given mobile number', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();
            await new User({
                name: 'Ilhoon',
                mobileNumber: '0798765432',
                deviceId: 'qazwsxedc',
                uuid: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
            }).save();

            return expect(
                createUser({
                    challenge: 'challenge',
                    clientId: 'terminal1',
                    deviceId: 'qazwsxedc',
                    mobileNumber: '0798765432',
                    name: 'Ilhoon',
                } as NewUser)
            ).rejects.toMatchObject({
                errorCode: 13003,
                message: 'A user already exists for the mobile number 0798765432',
            });
        });

        it('should create new user only if given id was issued to a card when called with id in payload', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();
            await new models.IssuedUuid({
                uuid: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                usedIn: 'card',
            }).save();

            await createUser({
                id: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                clientId: 'terminal1',
                deviceId: 'qazwsxedc',
                mobileNumber: '0798765432',
                name: 'Minhyuk',
            } as NewUser);

            const user = await User.findOne({
                mobileNumber: '0798765432',
            });
            expect(user).not.toBeNull();
            expect(user.deviceId).toEqual('default');
            expect(user.name).toEqual('Minhyuk');
            expect(user.roles.length).toEqual(1);
            expect(user.roles[0]).toEqual('MINICARD_USER');

            expect(user.uuid).toEqual('bdac5c25-ec05-47b6-a32c-6ea17377e31e');
        });

        it('should throw an error if the given id was not issued before', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();

            return expect(
                createUser({
                    id: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                    clientId: 'terminal1',
                    mobileNumber: '0798765432',
                    name: 'Changsub',
                } as NewUser)
            ).rejects.toMatchObject({
                errorCode: 13001,
                message: 'Invalid id given',
            });
        });

        it('should throw an error if the given id was issued to a mobile user before', async () => {
            await new OAuthClient({
                clientId: 'terminal1',
            }).save();
            await new models.IssuedUuid({
                uuid: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                usedIn: 'app',
            }).save();

            return expect(
                createUser({
                    id: 'bdac5c25-ec05-47b6-a32c-6ea17377e31e',
                    clientId: 'terminal1',
                    mobileNumber: '0798765432',
                    name: 'Changsub',
                } as NewUser)
            ).rejects.toMatchObject({
                errorCode: 13001,
                message: 'Invalid id given',
            });
        });
    });
});

describe('updateNic', () => {
    beforeEach(async () => {
        await new User({
            name: 'Kamal',
            roles: ['APP_USER'],
            mobileNumber: '0713930576',
            deviceId: 'ehEBrp_gc9g',
            uuid: 'c1f5b88f-d92d-4bf3-ac2b-ae71c56d47f8',
        }).save();
    });

    it('should retrun dob and gender for  user nic (9 / 12  and invalid letter format)', async () => {
        const bioData: any[] = [
            { nic: '', result: null },
            { nic: '231323', result: null },
            { nic: '90257378VC', result: null },
            { nic: '19902570378X', result: null },
            { nic: '199025703780', date: '1990-09-13', gender: GENDER.MALE },
            { nic: '902573780V', date: '1990-09-13', gender: GENDER.MALE },
            { nic: '925140380V', date: '1992-01-14', gender: GENDER.FEMALE },
            { nic: '199251400380', date: '1992-01-14', gender: GENDER.FEMALE },
            { nic: '199201400380', date: '1992-01-14', gender: GENDER.MALE },
            { nic: '925010380V', date: '1992-01-01', gender: GENDER.FEMALE },
            { nic: '935010380V', date: '1993-01-01', gender: GENDER.FEMALE },
            { nic: '590230380V', date: '1959-01-23', gender: GENDER.MALE },
            { nic: '565600380V', date: '1956-02-29', gender: GENDER.FEMALE },
            { nic: null, result: null },
            { nic: '575610380X', date: '1957-03-01', gender: GENDER.FEMALE },
            { nic: '575610380v', date: '1957-03-01', gender: GENDER.FEMALE },
        ];

        // tslint:disable-next-line: prefer-for-of
        for (let index = 0; index < bioData.length; index++) {
            const nic = bioData[index].nic;
            const date = bioData[index].date;
            const gender = bioData[index].gender;
            const bioDatum = calculateDobAndGender(nic);

            if (bioDatum != null) {
                const expectedDob = new Date(date);
                expect(bioDatum.birthDate).toEqual(expectedDob);
                expect(bioDatum.gender).toEqual(gender);
            } else {
                expect(bioDatum).toEqual(bioData[index].result);
            }
        }
    });

    it('should update user nic (10 letter format)', async () => {
        const r = await updateUserNic('c1f5b88f-d92d-4bf3-ac2b-ae71c56d47f8', '902573781V');
        expect(r.success).toEqual(true);
        const userTemp = await getUserByUuid('c1f5b88f-d92d-4bf3-ac2b-ae71c56d47f8');
        expect(userTemp.nic).toEqual('902573781V');
        expect(userTemp.gender).toEqual(GENDER.MALE);
    });

    it('should update user nic (12 letter format)', async () => {
        const r = await updateUserNic('c1f5b88f-d92d-4bf3-ac2b-ae71c56d47f8', '199251403801');
        expect(r.success).toEqual(true);
        const userTemp = await getUserByUuid('c1f5b88f-d92d-4bf3-ac2b-ae71c56d47f8');
        expect(userTemp.nic).toEqual('199251403801');
        expect(userTemp.gender).toEqual(GENDER.FEMALE);
    });
});

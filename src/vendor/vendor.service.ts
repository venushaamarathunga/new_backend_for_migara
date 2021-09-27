import { MongoError } from 'mongodb';
import { Types } from 'mongoose';
import uuid = require('uuid');
import logger from '../logger';
import { parseObjectId } from '../models';
import { User } from '../models/user';
import { Vendor, VendorPointSchemeType } from '../models/vendor';
import { IVendorCard, VendorCard } from '../models/vendor-cards';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { ErrorCodes } from '../utils/errors/ErrorCodes';
import { HTTP404Error } from '../utils/errors/HTTP404Error';
import { VendorOpts } from './VendorOpts';
import { VendorWebPortalConfig } from './VendorWebPortalConfig';

const LOG_LABEL = 'VendorService';

export async function createVendor(data: VendorOpts) {
    if (!data.pointSchemes) {
        throw new BadRequestError(
            'Missing parameter: `pointSchemes`',
            ErrorCodes.VENDOR_INVALID_PARAMETERS
        );
    }

    const vendor = new Vendor({
        givenName: data.givenName,
        fullName: data.fullName,
        thumbnailImage: data.thumbnailImage,
        terminalImage: data.terminalImage,
        storageBucket: data.storageBucket,
        pointSchemes: {},
        pin: data.pin,
    });

    for (let i = 0; i < data.pointSchemes.length; i++) {
        const schemeOpts = data.pointSchemes[i];
        const scheme: any = {
            type: schemeOpts.type as VendorPointSchemeType,
        };
        if (schemeOpts.type === VendorPointSchemeType.FIXED) {
            scheme.fixed = schemeOpts.value;
        } else if (schemeOpts.type === VendorPointSchemeType.PERCENT_OF_BILL) {
            scheme.percentageOfBillValue = schemeOpts.value;
        } else {
            throw new BadRequestError(
                'Invalid parameter: `pointSchems.type`',
                ErrorCodes.VENDOR_INVALID_PARAMETERS
            );
        }
        vendor.pointSchemes.set(`s${i}`, scheme);
    }

    return vendor
        .save()
        .then(saved => {
            logger.info(`New vendor created: ${saved.givenName}`, { label: LOG_LABEL });
            data.id = saved.id;
            return data;
        })
        .catch(e => {
            if (e instanceof MongoError && e.code === 11000) {
                throw new BadRequestError(
                    'Invalid parameters',
                    ErrorCodes.VENDOR_INVALID_PARAMETERS
                );
            }
            throw e;
        });
}

export async function getVendorProfile(vendorId: string) {
    return Vendor.findById(parseObjectId(vendorId, ErrorCodes.VENDOR_ID_INVALID)).then(vendor => {
        if (!vendor) {
            throw new HTTP404Error('Invalid parameter: `vendor`');
        }

        const profile: VendorOpts = {
            id: vendor.id,
            givenName: vendor.givenName,
            fullName: vendor.fullName,
            thumbnailImage: vendor.thumbnailImage,
            terminalImage: vendor.terminalImage,
            storageBucket: vendor.storageBucket,
            pin: vendor.pin,
            pointSchemes: [],
        };

        vendor.pointSchemes.forEach((val, key) => {
            const index = Number(key.substr(1)) || 0;
            profile.pointSchemes[index] = {
                type: val.type,
                value: null,
            };

            if (val.type === VendorPointSchemeType.FIXED) {
                profile.pointSchemes[index].value = val.fixed;
            } else if (val.type === VendorPointSchemeType.PERCENT_OF_BILL) {
                profile.pointSchemes[index].value = val.percentageOfBillValue;
            }
        });

        return profile;
    });
}

export async function createCardsForVendor(vendorId: string, numberOfCards: number) {
    return generateCards(parseObjectId(vendorId, ErrorCodes.VENDOR_ID_INVALID), numberOfCards);
}

export async function getVendorWebPortalConfig(
    vendorManagerUuid: string
): Promise<VendorWebPortalConfig> {
    return User.aggregate([
        {
            $match: { uuid: vendorManagerUuid },
        },
        {
            $lookup: {
                from: 'vendor-managers',
                localField: '_id',
                foreignField: 'userId',
                as: 'vendorManager',
            },
        },
        {
            $unwind: { path: '$vendorManager' },
        },
        {
            $lookup: {
                from: 'vendors',
                localField: 'vendorManager.vendorId',
                foreignField: '_id',
                as: 'vendor',
            },
        },
        {
            $unwind: { path: '$vendor' },
        },
    ])
        .then(data => {
            if (data.length === 0) {
                throw new BadRequestError('Invalid user', ErrorCodes.USER_ID_INVALID);
            }

            const user = data[0];
            const vendor = data[0].vendor;
            return {
                user: {
                    name: user.name,
                },
                vendor: {
                    id: vendor._id.toHexString(),
                    name: vendor.givenName,
                },
            };
        })
        .catch(e => {
            throw e;
        });
}

async function generateCards(
    vendorId: Types.ObjectId,
    numberOfCards: number,
    retries?: number,
    savedUuids?: string[]
): Promise<string[]> {
    retries = retries || 5;
    savedUuids = savedUuids || [];
    const inputs: IVendorCard[] = [];
    const uuids: string[] = [];
    for (let i = 0; i < numberOfCards; i++) {
        const id = uuid.v4();
        inputs.push({
            vendorId,
            uuid: id,
        } as IVendorCard);
        uuids.push(id);
    }
    return VendorCard.insertMany(inputs, { ordered: true })
        .then(() => {
            logger.info(`${inputs.length} cards inserted for vendor ${vendorId}`);
            return savedUuids.concat(uuids);
        })
        .catch(error => {
            if (error instanceof MongoError && error.code === 11000) {
                // duplicate uuid
                if (retries === 1) {
                    return savedUuids;
                }
                const bulkwriteError = error as any;
                if (bulkwriteError.result) {
                    numberOfCards -= bulkwriteError.result.nInserted;
                    savedUuids = savedUuids.concat(
                        uuids.slice(0, uuids.indexOf(bulkwriteError.op.uuid))
                    );
                }
                logger.info(
                    `Duplicate card uuid detected while inserting vendor cards. Attempting uuid generation again (Remaining attempts: ${--retries}).`,
                    { label: LOG_LABEL }
                );
                return generateCards(vendorId, numberOfCards, retries, savedUuids);
            }
        });
}

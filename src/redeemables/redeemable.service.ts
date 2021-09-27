import logger from '../logger';
import models, { IVendorRedeemable, VendorRedeemable } from '../models';
import { IUserRedeemable } from '../models/user-redeemables';
import { VendorManager } from '../models/vendor-manager';
import { BadRequestError } from '../utils/errors/BadRequestError';
import { RedeemableView } from './RedeemableView';

export async function createRedeemableForVendor(
    vendorUserId: string,
    data: RedeemableView
): Promise<RedeemableView> {
    return VendorManager.findVendorManagerByUUID(vendorUserId)
        .then(vendorManager => {
            if (!vendorManager) {
                throw new BadRequestError('Invalid client', 12007);
            }
            return new VendorRedeemable({
                vendorId: vendorManager.vendorId,
                targetPoints: data.targetPoints,
                title: data.title,
                description: data.description,
                thumbnailImageUrl: data.thumbnailImageUrl,
                imageUrls: data.imageUrls,
                expiryDate: data.expiryDate,
            } as IVendorRedeemable).save();
        })
        .then(redeemable => {
            logger.info(`saved vendor redeemable`, { label: 'redeemable-service' });
            return Promise.all([
                redeemable,
                models.VendorCustomer.find({ vendorId: redeemable.vendorId }),
            ]);
        })
        .then(([redeemable, customers]) => {
            const userRedeemables: IUserRedeemable[] = [];
            for (let i = 0, len = customers.length; i < len; i++) {
                userRedeemables.push({
                    userId: customers[i].userId,
                    vendorId: customers[i].vendorId,
                    targetPoints: redeemable.targetPoints,
                    redeemStatus: 'LOCKED',
                    title: redeemable.title,
                    description: redeemable.description,
                    thumbnailImageUrl: redeemable.thumbnailImageUrl,
                    imageUrls: redeemable.imageUrls,
                    expiryDate: redeemable.expiryDate,
                } as IUserRedeemable);
            }

            logger.info(
                `Pushing the redeemable ${redeemable._id} to ${userRedeemables.length} customers`,
                {
                    label: 'redeemable-service',
                }
            );
            return Promise.all([redeemable, models.UserRedeemable.insertMany(userRedeemables)]);
        })
        .then(([redeemable, userRedeemables]) => {
            return convertModelToDto(redeemable);
        })
        .catch(error => {
            throw error;
        });
}

function convertModelToDto(model: IVendorRedeemable) {
    const dto = new RedeemableView();
    dto.id = model._id.toString();
    dto.title = model.title;
    dto.description = model.description;
    dto.thumbnailImageUrl = model.thumbnailImageUrl;
    dto.imageUrls = model.imageUrls;
    dto.expiryDate = model.expiryDate;
    return dto;
}

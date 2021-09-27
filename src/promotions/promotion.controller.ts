import express from 'express';
import PromotionCampaign from './PromotionCampaign';
import UserPromotionList from './UserPromotionList';
import { promotionService } from './promotion.service';
import { IPromotionCampaign } from './../models/promotion-campaign';
import { BadRequestError } from './../utils/errors/BadRequestError';

const mongoose = require('mongoose');

const promotionController = express.Router();

promotionController.get('/validate', (req, res) => {
    const userPromotionList = new UserPromotionList();
    return res.json(userPromotionList);
});

promotionController.post('/', (req, res, next) => {
    const promotion: PromotionCampaign = req.body;
    promotionService
        .createPromotion(promotion)
        .then((promotionCampaign: IPromotionCampaign) => {
            res.status(201).json(new PromotionCampaign(promotionCampaign));
        })
        .catch((error: any) => {
            if (error instanceof mongoose.Error.ValidationError) {
                next(new BadRequestError('Valid details are not provided'));
            } else {
                next(error);
            }
        });
});

export default promotionController;

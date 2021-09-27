import express from 'express';
import UserProfile from './UserProfile';
import RedeemableItem from './redeemables/redeemable-item/RedeemableItem';
import Points from './points/points';
import Vendor from './vendors/Vendor';
import UserPromotionList from '../promotions/UserPromotionList';
import Redeemable from './redeemables/Redeemable';

const userController = express.Router();

userController.get('/:id', (req, res, next) => {
    const id = req.params.id;
    let userData = new UserProfile(id);

    return res.json(userData);
});

userController.patch('/:uId/redeemables/:id', (req, res) => {
    const id = req.params.id;
    let redeemStatus = new RedeemableItem(id);

    return redeemStatus.redeemStatus === 'UNLOCKED' ? res.send() : console.log('error');
});

userController.patch('/:uId/points', (req, res) => {
    const delta = req.body.delta;
    const points = new Points(delta);

    return res.json(points);
});

userController.get('/:id/vendors', (req, res) => {
    const vendors = new Vendor();
    return res.json(vendors);
});

userController.get('/:id/vendors/:id/redeemable', (req, res) => {
    const params = req.query;
    const redeemable = new Redeemable(params);

    return res.json(redeemable);
});

userController.get('/:id/vendors/:id/promotions', (req, res) => {
    const userPromotionList = new UserPromotionList();
    return res.json(userPromotionList);
});

export default userController;

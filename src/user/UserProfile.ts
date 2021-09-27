import RedeemableItem from './redeemables/redeemable-item/RedeemableItem';
import RegisteredShop from './registered-shop/RegisteredShop';

export default class UserProfile {
    public id: String = '1c392ac0-dd36-47b2-9f2c-b550e61bdd3d';
    public name: String = 'Venusha';
    public redeemableItems: Array<RedeemableItem> = [redeemableItem];
    public registeredShops: Array<RegisteredShop> = [registeredShop];

    constructor(id: String) {
        this.id = id;
    }
}

let redeemableItem = new RedeemableItem('514');
let registeredShop = new RegisteredShop();

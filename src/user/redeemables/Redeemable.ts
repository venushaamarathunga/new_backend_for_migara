import RedeemableItem from './redeemable-item/RedeemableItem';
import Challenge from '../challenges/Challenge';

export default class Redeemable {
    public pointsEarned: Number = 70;
    public pointsRequiredForNextGift: Number = 10;
    public giftsCollected: Number = 2;
    public redeemables: Array<Redeemables> = [new Redeemables()];
    public challenge: Array<Challenge> = [new Challenge()];
    public pagination: Array<Pagination>;

    constructor(params: any) {
        this.pagination = [new Pagination(params)];
    }
}

class Redeemables {
    public redeemableItem: Array<RedeemableItem> = [new RedeemableItem('514')];
    public pointsToFulfill: Number = 20;
}

class Pagination {
    public page: Number;
    public pageSize: Number;
    public totalElements: Number = 430;
    public totalPages: Number = 60;

    constructor(params: any) {
        this.page = parseInt(params.page);
        this.pageSize = parseInt(params.pageSize);
    }
}

import Pagination from '../../paginations/Pagination';
import Challenge from '../challenges/Challenge';
import RedeemableItem from '../redeemables/redeemable-item/RedeemableItem';

export default class UserRegisteredVendor {
    public pointsEarned: number;
    public pointsRequiredForNextGift: number;
    public giftsCollected: number;
    public progressToNextGift: number;
    public redeemables: RedeemableItem[];
    public pagination: Pagination;
    // public challenge: Challenge[] = [new Challenge()]; // todo: should develop it
    constructor() {
        this.pointsEarned = 0;
        this.pointsRequiredForNextGift = 0;
        this.giftsCollected = 0;
        this.progressToNextGift = 0;
    }
}

export default class RedeemableItem {
    public id: String = '514';
    public thumbnailImageUrl: String =
        'https://cdn.pixabay.com/photo/2013/07/21/13/00/rose-165819_1280.jpg';
    public largeImageUrl: String =
        'https://cdn.pixabay.com/photo/2014/04/10/11/24/red-rose-320868_1280.jpg';
    public briefDescription: String = 'Brief Description';
    public detailedDescription: String = 'Detailed Description';
    public redeemStatus: RedeemStatus = RedeemStatus.UNLOCKED;
    public expiryDate = new Date().toISOString();

    constructor(id: String) {
        this.id = id;
    }
}

const enum RedeemStatus {
    LOCKED = 'LOCKED',
    UNLOCKED = 'UNLOCKED',
    EXPIRED = 'EXPIRED',
    USED = 'USED',
    redeemStatus = 'redeemStatus'
}

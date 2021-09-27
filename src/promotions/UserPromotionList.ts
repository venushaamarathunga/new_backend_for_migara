export default class UserPromotionList {
    public promotions: Array<UserPromotion> = [new UserPromotion()];
}

class UserPromotion {
    public vendorName: String = 'Usha';
    public title: String = 'title of the Promotion';
    public thumbnailImageUrl: String =
        'https://images.pexels.com/photos/757889/pexels-photo-757889.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500';
    public largeImageUrl: String =
        'https://images.pexels.com/photos/132472/pexels-photo-132472.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500';
    public briefDescription: String = 'Brief Description';
    public detailedDescription: String = 'Detailed Description';
    public expiresAt = new Date().toISOString();
}

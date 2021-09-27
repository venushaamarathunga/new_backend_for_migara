export default class Vendor {
    public vendors: Array<Vendors> = [new Vendors()];
}
class Vendors {
    public id: String = 'bbb';
    public thumbnailImageUrl: String =
        'https://images.pexels.com/photos/1133957/pexels-photo-1133957.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500';
    public unreadNotifCount: Number = 3;
}

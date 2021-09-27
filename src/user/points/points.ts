export default class Points {
    public points: Number = 0;

    constructor(delta: any) {
        let point = 100;
        this.points = point + delta;
    }
}

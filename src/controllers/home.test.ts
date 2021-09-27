import { index } from './home';

describe('home controller', () => {
    test('index response', async () => {
        const res: any = {};
        res.send = jest.fn().mockReturnValue(res);

        index(null, res);
        expect(res.send).toHaveBeenCalledWith('Hello World!');
    });
});

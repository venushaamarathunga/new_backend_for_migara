import { Request, Response } from 'express';
import logger from '../logger';
import User from '../models/user';

export const index = (req: Request, res: Response) => {
    logger.log({ level: 'info', message: 'Root called' });
    res.send('Hello World!');
};

export const users = async (req: Request, res: Response) => {
    const userss = await User.find().exec();
    res.send(userss);
};

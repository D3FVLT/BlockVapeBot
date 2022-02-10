import { getRepository } from 'typeorm';

import { User } from "../entity/User";

export async function setUser(tg_id: string, name: string, phone_number: string) {
    const getUserRepository = getRepository(User);
    const user = new User();
    user.tg_id = tg_id;
    user.firstName = name;
    user.phone_number = phone_number;
    await getUserRepository.save(user);
    console.log('New user has been registered');
}
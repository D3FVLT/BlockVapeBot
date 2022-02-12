import { getRepository } from 'typeorm';

import { User } from '../entity/User';

export async function getUser(tg_id: number) {
  const getUserRepository = getRepository(User);
  const finder = await getUserRepository.findOne({ where: { tg_id: `${tg_id.toString()}` } });
  if (finder) {
    return finder;
  } else {
    console.log('Unregistered user... Change route to register');
  }
}

import { createConnection } from 'typeorm';

import { start } from './bot';

createConnection()
  .then(async () => {
    console.log('Connected...');
    return start();
  })
  .catch(e => {
    console.error(e);
  });
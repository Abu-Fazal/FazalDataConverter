import { get, post, del } from './api.client';

export const accountApi = {
  getAccount: () => get('/account'),

  reauthenticate: () => post('/account/reauthenticate', {}),

  deleteAccount: (confirmation, consent) =>
    del('/account', { confirmation, consent }),
};
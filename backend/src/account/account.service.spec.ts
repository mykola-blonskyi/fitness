import { AccountService } from './account.service';

function build(storageFails = false) {
  const calls: string[] = [];
  const step = (name: string, fails = false) =>
    jest.fn(() => {
      calls.push(name);
      return fails ? Promise.reject(new Error(name)) : Promise.resolve();
    });
  const service = new AccountService(
    { remove: step('users') } as never,
    { deleteForUser: step('dailyLogs') } as never,
    {} as never,
    { deleteForUser: step('trainingPrograms') } as never,
    {} as never,
    {} as never,
    { deleteForUser: step('diets') } as never,
    {} as never,
    {} as never,
    {} as never,
    { removeUserObjects: step('storage', storageFails) } as never,
  );
  return { service, calls };
}

describe('AccountService.delete', () => {
  it('removes objects first and the user row last', async () => {
    const { service, calls } = build();

    await service.delete('u');

    expect(calls).toEqual([
      'storage',
      'dailyLogs',
      'trainingPrograms',
      'diets',
      'users',
    ]);
  });

  it('keeps every row when storage cleanup fails, so the user can retry', async () => {
    const { service, calls } = build(true);

    await expect(service.delete('u')).rejects.toThrow('storage');
    expect(calls).toEqual(['storage']);
  });
});

import { ExercisesService } from './exercises.service';

describe('ExercisesService.create', () => {
  it('records the author and leaves the entry unverified, so only they see it', async () => {
    const values = jest.fn().mockReturnValue({
      returning: () => Promise.resolve([{ id: 'e1', isVerified: false }]),
    });
    const service = new ExercisesService({
      insert: () => ({ values }),
    } as never);

    await service.create('user-1', { name: 'Curl', category: 'biceps' });

    expect(values).toHaveBeenCalledWith({
      name: 'Curl',
      category: 'biceps',
      authorId: 'user-1',
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('refuses an identity without the backend secret', () => {
    return request(app.getHttpServer())
      .get('/me')
      .set('x-user-id', 'sub-1')
      .set('x-user-email', 'user1@example.com')
      .expect(401);
  });

  it('rate limits a caller past 300 requests a minute', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 300; i++) {
      await request(server).get('/').expect(200);
    }
    await request(server).get('/').expect(429);
  });

  afterEach(async () => {
    await app.close();
  });
});

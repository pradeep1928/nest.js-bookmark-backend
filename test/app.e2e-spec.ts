import { Test } from '@nestjs/testing';
import * as pactum from 'pactum';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.init();
    await app.listen(3333);
    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'pradeep@gmail.com',
      password: 'pradeep123',
    };

    describe('Signup', () => {
      it('should throw error if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400); // .inspect()
      });
      it('should throw error if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400); // .inspect()
      });
      it('should throw error if both are empty', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400); // .inspect()
      });

      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201); // .inspect()
      });
    });

    describe('Login', () => {
      it('should throw error if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/login')
          .withBody({ password: dto.password })
          .expectStatus(400); // .inspect()
      });
      it('should throw error if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/login')
          .withBody({ email: dto.email })
          .expectStatus(400); // .inspect()
      });
      it('should throw error if both are empty', () => {
        return pactum.spec().post('/auth/login').expectStatus(400); // .inspect()
      });

      it('should login', () => {
        return pactum
          .spec()
          .post('/auth/login')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token'); // .inspect()
      });
    });
  });

  describe('User', () => {
    const dto: EditUserDto = {
      firstName: 'pradeep2',
      email: 'pradeep2@gmail.com',
    };
    describe('Get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200); // .inspect()
      });
    });

    describe('Edit user', () => {
      it('should edit current user', () => {
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.email); // .inspect()
      });
    });
  });

  describe('Bookmarks', () => {
    describe('Get Empty bookmark', () => {
      it('should get bookmark', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBody([])
          .inspect();
      });
    });

    describe('Create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'First Bookmark',
        link: 'https://google.com',
      };
      it('should Create Bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id')
          .inspect();
      });
    });

    describe('Get bookmark by Id', () => {
      it('should get bookmark by userId', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .inspect();
      });
    });

    describe('Edit bookmark', () => {
      const dto: EditBookmarkDto = {
        title: 'New Bookmark',
        description: 'this is new bookmark',
      };
      it('should Edit bookmark by id', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .inspect();
      });
    });

    describe('Delete bookmark', () => {
      it('should Delete bookmark by id', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(204)
          .inspect();
      });

      it('should get empty bookmark', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectJsonLength(0)
          .inspect();
      });

    });
  });
});

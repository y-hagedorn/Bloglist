const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const Blog = require('../models/blog')
const User = require('../models/user')
const bcrypt = require('bcrypt')

const api = supertest(app)

let token

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  // create a dummy user
  const passwordHash = await bcrypt.hash('password', 10)
  const user = new User({ username: 'testuser', name: 'Test User', passwordHash })
  await user.save()

  // Log in to get a valid token
  const loginResponse = await api
    .post('/api/login')
    .send({ username: 'testuser', password: 'password' })

  token = loginResponse.body.token // Extract the token from login response

  // fill the database with initial blogs
  for (const blog of helper.initialBlogs) {
    let blogObject = new Blog(blog)
    blogObject.user = user._id
    await blogObject.save()
  }
})

describe('viewing blog posts', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('there are as many blogs as saved to the database', async () => {
    const response = await api
      .get('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('blog posts have the id field instead of _id', async () => {
    const response = await api
      .get('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
    assert(response.body.length > 0, 'There should be at least one blog post')

    const blog = response.body[0]
    assert(blog.id, 'The blog post should have an "id" field')
    assert(!blog._id, 'The blog post should not have an "_id" field')
  })
})

describe('addition of a new blog post', () => {
  test('a valid blog post can be added', async () => {
    const newBlog = {
      "title": "Fullstack Open Course",
      "author": "Matti Luukkainen",
      "url": "https://fullstackopen.com/en/",
      "likes": 7
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)
    const titles = blogsAtEnd.map(b => b.title)
    assert(titles.includes('Fullstack Open Course'))
  })

  test('if the likes property is missing from the request, it will default to the value 0', async () => {
    const newBlog = {
      "title": "Fullstack Open Course",
      "author": "Matti Luukkainen",
      "url": "https://fullstackopen.com/en/",
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)
    const createdBlog = blogsAtEnd.find(blog => blog.title === 'Fullstack Open Course')
    assert(createdBlog, 'The blog should have been added')
    assert.strictEqual(createdBlog.likes, 0, 'The likes property should default to 0 when missing')
  })

  test('if the title is missing, the backend responds with 400 Bad Request', async () => {
    const newBlogWithoutTitle = {
      author: "Matti Luukkainen",
      url: "https://fullstackopen.com/en/",
      likes: 7
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlogWithoutTitle)
      .expect(400)
  })

  test('if the url is missing, the backend responds with 400 Bad Request', async () => {
    const newBlogWithoutUrl = {
      title: "Fullstack Open Course",
      author: "Matti Luukkainen",
      likes: 7
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlogWithoutUrl)
      .expect(400)
  })

  test('if no token is provided, the backend responds with 401 Unauthorized', async () => {
    const newBlog = {
      title: "Fullstack Open Course",
      author: "Matti Luukkainen",
      likes: 7
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
  })

  test('if token provided is invalid, the backend responds with 401 Unauthorized', async () => {
    const newBlog = {
      title: "Fullstack Open Course",
      author: "Matti Luukkainen",
      likes: 7
    }

    await api
      .post('/api/blogs')
      .set('Authorization', 'Bearer invalid}')
      .send(newBlog)
      .expect(401)
  })
})

describe('updating a blog post', () => {
  test('updating the likes of a blog post', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]
    const updatedLikes = {
      likes: 42
    }

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedLikes)
      .expect(200)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    assert.strictEqual(blogsAtEnd[0].likes, updatedLikes.likes)
  })
})

describe('deletion of a blog post', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

    const titles = blogsAtEnd.map(b => b.title)
    assert(!titles.includes(blogToDelete.title))
  })

  test('fails with statuscode 404 if blog does not exist', async () => {
    const validNonexistingId = await helper.nonExistingId()

    await api
      .get(`/api/notes/${validNonexistingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })

  test('if the id is invalid, the backend responds with 400 Bad Request', async () => {
    await api
      .delete(`/api/blogs/someInvalidId`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })
})

after(async () => {
  await mongoose.connection.close()
})
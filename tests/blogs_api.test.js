const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const Blog = require('../models/blog')

const api = supertest(app)


beforeEach(async () => {
  await Blog.deleteMany({})

  for (const blog of helper.initialBlogs) {
    let blogObject = new Blog(blog)
    await blogObject.save()
  }
})

describe('viewing blog posts', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('there are as many blogs as saved to the database', async () => {
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('blog posts have the id field instead of _id', async () => {
    const response = await api.get('/api/blogs')
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
      .send(newBlogWithoutTitle)
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('if the url is missing, the backend responds with 400 Bad Request', async () => {
    const newBlogWithoutUrl = {
      title: "Fullstack Open Course",
      author: "Matti Luukkainen",
      likes: 7
    }

    await api
      .post('/api/blogs')
      .send(newBlogWithoutUrl)
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })
})

describe('deletion of a blog post', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

    const titles = blogsAtEnd.map(b => b.title)
    assert(!titles.includes(blogToDelete.title))
  })

  test('if the id is invalid, the backend responds with 400 Bad Request', async () => {
    await api
      .delete(`/api/blogs/someInvalidId`)
      .expect(400)
  })
})

after(async () => {
  await mongoose.connection.close()
})
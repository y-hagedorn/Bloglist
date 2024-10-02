const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Blog = require('../models/blog')

const api = supertest(app)

const initialBlogs = [
  {
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7,
  },
  {
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    likes: 5,
  },
  {
    title: "Canonical string reduction",
    author: "Edsger W. Dijkstra",
    url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
    likes: 12,
  },
  {
    title: "First class tests",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.htmll",
    likes: 10,
  },
  {
    title: "TDD harms architecture",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html",
    likes: 0,
  },
  {
    title: "Type wars",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html",
    likes: 2,
  }
]

beforeEach(async () => {
  await Blog.deleteMany({})
  for (const blog of initialBlogs) {
    let blogObject = new Blog(blog)
    await blogObject.save()
  }
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('there are as many blogs as saved to the database', async () => {
  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, initialBlogs.length)
})

test('blog posts have the id field instead of _id', async () => {
  const response = await api.get('/api/blogs')
  assert(response.body.length > 0, 'There should be at least one blog post')
  
  const blog = response.body[0]
  assert(blog.id, 'The blog post should have an "id" field')
  assert(!blog._id, 'The blog post should not have an "_id" field')
})

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

  const response = await api.get('/api/blogs')
  const titles = response.body.map(r => r.title)
  assert.strictEqual(response.body.length, initialBlogs.length + 1)
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

  const response = await api.get('/api/blogs')
  const titles = response.body.map(r => r.title)
  assert.strictEqual(response.body.length, initialBlogs.length + 1)
  const createdBlog = response.body.find(blog => blog.title === 'Fullstack Open Course')
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

after(async () => {
  await mongoose.connection.close()
})
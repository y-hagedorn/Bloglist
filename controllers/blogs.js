const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')


// GET
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

// POST
blogsRouter.post('/', async (request, response) => {
  const body = request.body
  // get user from request object
  const user = request.user

  if (!user) {
    return response.status(401).json({ error: 'User authentication failed' })
  }
  if (!body.title) {
    return response.status(400).json({
      error: 'title missing'
    })
  }
  if (!body.url) {
    return response.status(400).json({
      error: 'url missing'
    })
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    user: user._id,
    likes: body.likes,
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)
})

// PUT
blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const blog = {
    user: body.user,
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  }

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
    .populate('user', { username: 1, name: 1 })
  if (!updatedBlog) {
    return response.status(404).json({ error: 'Blog not found' })
  }
  response.json(updatedBlog)
})

// DELETE
blogsRouter.delete('/:id', async (request, response) => {
  // get user from request object
  const user = request.user
  if (!user) {
    return response.status(401).json({ error: 'User authentication failed' })
  }

  const blog = await Blog.findById(request.params.id)
  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }
  if (blog.user.toString() !== user._id.toString()) {
    return response.status(403).json({ error: 'unauthorized access to delete this blog' })
  }
  // If the token matches, delete the blog
  await Blog.findByIdAndDelete(request.params.id)
  response.status(204).end()
})

module.exports = blogsRouter
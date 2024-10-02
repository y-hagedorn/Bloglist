const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) return {}

  const favorite = blogs.reduce((favorite, blog) => {
    return blog.likes > favorite.likes ? blog : favorite
  }, blogs[0])

  return {
    title: favorite.title,
    author: favorite.author,
    likes: favorite.likes,
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return {}

  const blogCount = blogs.reduce((counts, blog) => {
    counts[blog.author] = (counts[blog.author] || 0) + 1
    return counts
  }, {})

  const mostBlogsAuthor = Object.keys(blogCount).reduce((mostBlogs, author) => {
    return blogCount[author] > blogCount[mostBlogs] ? author : mostBlogs
  })

  return {
    author: mostBlogsAuthor,
    blogs: blogCount[mostBlogsAuthor]
  }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return {}

    const authorsLikes = blogs.reduce((counts, blog) => {
      counts[blog.author] = (counts[blog.author] || 0) + blog.likes
      return counts
    }, {})
  
    const authorWithMostLikes = Object.keys(authorsLikes).reduce((mostLikes, author) => {
      return authorsLikes[author] > authorsLikes[mostLikes] ? author : mostLikes
    })
  
    return {
      author: authorWithMostLikes,
      likes: authorsLikes[authorWithMostLikes],
    }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
}
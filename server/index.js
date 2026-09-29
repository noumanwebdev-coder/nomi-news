import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import Parser from 'rss-parser'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 5000
const distPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')

app.use(cors())
app.use(express.json())

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, maxlength: 200 },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true })

const Message = mongoose.model('Message', messageSchema)
const rssParser = new Parser({ customFields: { item: ['source'] } })
const demoMessages = []
const cache = new Map()
const topicQueries = {
  world: 'world news',
  business: 'business economy',
  technology: 'technology science',
  climate: 'climate environment',
  culture: 'culture arts',
}

async function fetchGdeltArticles(query, topic) {
  const params = new URLSearchParams({
    query: `${query} sourcelang:english`,
    mode: 'ArtList',
    format: 'json',
    maxrecords: '24',
    sort: 'DateDesc',
    timespan: '3d',
  })
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`)
  const data = await response.json()

  return (data.articles || []).map((article, index) => ({
    id: `${article.url || article.title}-${index}`,
    title: article.title,
    url: article.url,
    image: article.socialimage || '',
    source: article.domain || 'News source',
    publishedAt: article.seendate,
    topic,
  })).filter((article) => article.title && article.url)
}

app.get('/api/news', async (req, res) => {
  const topic = String(req.query.topic || 'world').toLowerCase()
  const query = topicQueries[topic] || topic.replace(/[^a-z0-9 ]/g, '').slice(0, 60) || 'world news'
  const key = query.toLowerCase()
  const cached = cache.get(key)

  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    return res.json({ articles: cached.articles, cached: true })
  }

  try {
    const params = new URLSearchParams({ q: `${query} when:3d`, hl: 'en-US', gl: 'US', ceid: 'US:en' })
    const response = await fetch(`https://news.google.com/rss/search?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 NomiNews/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Google News returned ${response.status}`)
    const feed = await rssParser.parseString(await response.text())
    const articles = (feed.items || []).slice(0, 24).map((item, index) => {
      const title = item.title || ''
      const sourceMatch = title.match(/\s+-\s+([^-]+)$/)
      const source = typeof item.source === 'string' ? item.source : item.source?._
      return {
        id: item.guid || item.link || `${title}-${index}`,
        title: sourceMatch ? title.slice(0, sourceMatch.index) : title,
        url: item.link,
        image: item.enclosure?.url || '',
        source: source || sourceMatch?.[1]?.trim() || 'News source',
        publishedAt: item.isoDate || item.pubDate,
        topic,
      }
    }).filter((article) => article.title && article.url)
    if (!articles.length) throw new Error('Google News returned no articles')
    cache.set(key, { time: Date.now(), articles })
    return res.json({ articles, cached: false, provider: 'Google News' })
  } catch (rssError) {
    console.error('Google News feed error:', rssError.message)
    try {
      const articles = await fetchGdeltArticles(query, topic)
      cache.set(key, { time: Date.now(), articles })
      res.json({ articles, cached: false, provider: 'GDELT' })
    } catch (gdeltError) {
      console.error('GDELT feed error:', gdeltError.message)
      res.status(502).json({ error: 'The live news feed is temporarily unavailable.' })
    }
  }
})

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {}
  if (![name, email, subject, message].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'Please complete every field.' })
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  try {
    const fields = { name, email, subject, message }
    if (mongoose.connection.readyState === 1) {
      await Message.create(fields)
    } else {
      demoMessages.push({ ...fields, receivedAt: new Date() })
    }
    res.status(201).json({ message: 'Thanks for reaching out. Your note is with our team.' })
  } catch (error) {
    console.error('Contact form error:', error.message)
    res.status(500).json({ error: 'Your message could not be sent. Please try again.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'demo mode' })
})

app.use(express.static(distPath))
app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
  res.sendFile(resolve(distPath, 'index.html'))
})

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection failed:', error.message))
} else {
  console.log('MONGO_URI not set; contact messages use temporary demo storage.')
}

app.listen(port, () => console.log(`Nomi News API listening on port ${port}`))
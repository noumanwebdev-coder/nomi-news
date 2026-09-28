import { useEffect, useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown,
  Clock3, Globe2, Leaf, Menu, Search, Send, Waves, X,
} from 'lucide-react'

const sections = ['Home', 'News', 'About', 'Latest', 'Contact us']
const topics = ['world', 'business', 'technology', 'climate', 'culture']

const fallbackImages = [
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
]

function formatDate(value) {
  if (!value) return 'Just now'
  const date = /^\d{14}$/.test(value)
    ? new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function ArticleCard({ article, index, featured = false }) {
  const [saved, setSaved] = useState(false)
  const image = article.image || fallbackImages[index % fallbackImages.length]
  return (
    <article className={`article-card${featured ? ' article-card--featured' : ''}`}>
      <a className="article-image" href={article.url} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}>
        <img src={image} alt="" loading={index > 0 ? 'lazy' : 'eager'} onError={(event) => { event.currentTarget.src = fallbackImages[index % fallbackImages.length] }} />
        <span className="image-source">{article.source}</span>
      </a>
      <div className="article-content">
        <div className="article-meta"><span>{article.topic || 'World'}</span><span className="meta-dot" /><time>{formatDate(article.publishedAt)}</time></div>
        <a href={article.url} target="_blank" rel="noreferrer" className="article-title">{article.title}</a>
        <div className="article-footer">
          <a href={article.url} target="_blank" rel="noreferrer" className="read-link">Read story <ArrowUpRight size={14} /></a>
          <button className={`icon-button save-button${saved ? ' is-saved' : ''}`} onClick={() => setSaved(!saved)} aria-label={saved ? 'Remove bookmark' : 'Bookmark article'} title={saved ? 'Saved' : 'Save story'}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button>
        </div>
      </div>
    </article>
  )
}

function App() {
  const [page, setPage] = useState(window.location.hash.slice(1) || 'Home')
  const [topic, setTopic] = useState('world')
  const [articles, setArticles] = useState([])
  const [feedStatus, setFeedStatus] = useState('loading')
  const [feedRetry, setFeedRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [formStatus, setFormStatus] = useState('idle')

  useEffect(() => {
    const syncPage = () => setPage(decodeURIComponent(window.location.hash.slice(1)) || 'Home')
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setFeedStatus('loading')
    fetch(`/api/news?topic=${encodeURIComponent(topic)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Feed unavailable')
        return response.json()
      })
      .then((data) => { setArticles(data.articles || []); setFeedStatus('ready') })
      .catch((error) => { if (error.name !== 'AbortError') setFeedStatus('error') })
    return () => controller.abort()
  }, [topic, feedRetry])

  const visibleArticles = articles.filter((article) => article.title.toLowerCase().includes(search.toLowerCase()) || article.source.toLowerCase().includes(search.toLowerCase()))
  const goTo = (section) => { window.location.hash = section; setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function submitContact(event) {
    event.preventDefault()
    const form = event.currentTarget
    setFormStatus('sending')
    const fields = Object.fromEntries(new FormData(form))
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send message')
      setFormStatus('sent')
      form.reset()
    } catch (error) {
      setFormStatus(error.message === 'Failed to fetch' ? 'offline' : 'error')
    }
  }

  return (
    <div className="site-shell">
      <div className="topline"><span><span className="live-dot" /> Independent journalism, for a world in motion</span><span className="topline-date">A clearer view, every day <ArrowUpRight size={13} /></span></div>
      <header className="site-header">
        <a className="wordmark" href="#Home" onClick={() => goTo('Home')} aria-label="Nomi News home"><span className="wordmark-mark"><Waves size={23} strokeWidth={2.1} /></span><span>Nomi<span className="wordmark-news">News</span></span><span className="wordmark-period">.</span></a>
        <nav className={`main-nav${mobileNav ? ' is-open' : ''}`} aria-label="Main navigation">
          {sections.map((section) => <a key={section} href={`#${section}`} onClick={() => { setPage(section); setMobileNav(false) }} className={page === section ? 'active' : ''}>{section}</a>)}
        </nav>
        <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}>{mobileNav ? <X size={21} /> : <Menu size={21} />}</button>
        <button className="header-subscribe" onClick={() => goTo('Contact us')}>Get in touch <ArrowUpRight size={15} /></button>
      </header>

      {page === 'Home' && <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THE WORLD, IN PERSPECTIVE</div>
            <h1>Good news<br />starts with <em>curiosity.</em></h1>
            <p>Thoughtful reporting for a world that never stands still. Get closer to the stories shaping what comes next.</p>
            <button className="primary-button" onClick={() => goTo('News')}>Explore today&apos;s stories <ArrowRight size={16} /></button>
            <div className="hero-note"><span className="hero-note-icon"><Globe2 size={16} /></span><span>Independent voices.<br /><strong>A more connected world.</strong></span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=90" alt="Mountain lake surrounded by a quiet forest" /><div className="hero-image-shade" /></div>
            <div className="visual-stamp"><span>READ<br />WIDELY</span><Waves size={19} /></div>
            <div className="hero-caption"><span className="caption-index">01 / 05</span><span>Our planet, our shared story</span><ArrowDown size={15} /></div>
          </div>
        </section>
        <section className="ticker" aria-label="Editorial principles"><span><Leaf size={15} /> A LITTLE MORE CONTEXT</span><i /> <span>People before noise</span><i /> <span>Stories without borders</span><i /> <span>Perspective with purpose</span><i /> <span className="ticker-trail">NOMI NEWS&nbsp; / &nbsp;NOMI NEWS&nbsp; / &nbsp;NOMI NEWS&nbsp; / &nbsp;</span></section>
        <NewsSection articles={visibleArticles} feedStatus={feedStatus} topic={topic} setTopic={setTopic} search={search} setSearch={setSearch} onBrowse={() => goTo('News')} />
        <AboutStrip onRead={() => goTo('About')} />
      </main>}

      {page === 'News' && <main><PageIntro eyebrow="THE BIG PICTURE" title={<>Stories worth<br /><em>understanding.</em></>} text="A considered look at the events, ideas and people shaping our shared future." icon={<Globe2 size={20} />} /><NewsSection articles={visibleArticles} feedStatus={feedStatus} topic={topic} setTopic={setTopic} search={search} setSearch={setSearch} /></main>}
      {page === 'Latest' && <main><PageIntro eyebrow="FRESH FROM THE NEWSROOM" title={<>The world,<br /><em>as it happens.</em></>} text="The latest reporting from trusted newsrooms around the world, updated throughout the day." icon={<Clock3 size={20} />} /><NewsSection articles={visibleArticles} feedStatus={feedStatus} topic={topic} setTopic={setTopic} search={search} setSearch={setSearch} latest /></main>}
      {page === 'About' && <main><PageIntro eyebrow="WHY NOMI" title={<>A wider lens.<br /><em>A better informed world.</em></>} text="We believe the news can bring us closer to understanding, not just closer to the next update." icon={<Waves size={20} />} /><AboutPage onContact={() => goTo('Contact us')} /></main>}
      {page === 'Contact us' && <main><PageIntro eyebrow="START A CONVERSATION" title={<>We&apos;re all<br /><em>ears.</em></>} text="A story tip, a question, a kind note, or a bold idea. Our inbox is open." icon={<Send size={20} />} /><ContactPage onSubmit={submitContact} status={formStatus} /></main>}

      <footer className="site-footer"><div className="footer-main"><a className="wordmark footer-wordmark" href="#Home" onClick={() => goTo('Home')}><span className="wordmark-mark"><Waves size={22} /></span><span>Nomi<span className="wordmark-news">News</span></span><span className="wordmark-period">.</span></a><p>A clearer view of the world.<br />Made for the curious.</p><nav aria-label="Footer navigation">{sections.map((section) => <a key={section} href={`#${section}`} onClick={() => goTo(section)}>{section}</a>)}</nav><span className="footer-globe"><Globe2 size={20} /> GOOD STORIES TRAVEL</span></div><div className="footer-bottom"><span>© 2026 Nomi News. Independent by nature.</span><span>Headlines via Google News &amp; GDELT <ArrowUpRight size={12} /></span></div></footer>
    </div>
  )
}

function PageIntro({ eyebrow, title, text, icon }) {
  return <section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h1>{title}</h1><p>{text}</p></div><span className="intro-icon">{icon}</span></section>
}

function NewsSection({ articles, feedStatus, topic, setTopic, search, setSearch, onBrowse, latest = false }) {
  const displayArticles = latest ? articles : articles.slice(0, 6)
  return <section className="news-section" id="news-feed">
    <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE DAILY CURRENT</div><h2>Stories in <em>focus.</em></h2></div><button className="text-button" onClick={onBrowse || (() => window.location.hash = 'Latest')}>All stories <ArrowRight size={15} /></button></div>
    <div className="news-controls"><div className="topic-tabs" role="group" aria-label="Filter stories by topic">{topics.map((item) => <button key={item} className={topic === item ? 'topic-active' : ''} onClick={() => setTopic(item)}>{item}</button>)}</div><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a story" aria-label="Search stories" /></label></div>
    {feedStatus === 'loading' && <div className="feed-message"><span className="loading-ring" /> Finding the latest stories...</div>}
    {feedStatus === 'error' && <div className="feed-message feed-error"><span>The live feed is taking a moment.</span><button onClick={() => setFeedRetry((value) => value + 1)}>Try again <ArrowRight size={14} /></button></div>}
    {feedStatus === 'ready' && displayArticles.length === 0 && <div className="feed-message">No stories match that search. Try a different phrase.</div>}
    {feedStatus === 'ready' && displayArticles.length > 0 && <div className="article-grid">{displayArticles.map((article, index) => <ArticleCard key={article.id} article={article} index={index} featured={!latest && index === 0} />)}</div>}
    {feedStatus === 'ready' && !latest && <button className="browse-button" onClick={onBrowse || (() => window.location.hash = 'Latest')}>More stories from around the world <ArrowDown size={15} /></button>}
  </section>
}

function AboutStrip({ onRead }) {
  return <section className="about-strip"><div className="about-mark"><Waves size={42} /></div><div><div className="eyebrow"><span className="eyebrow-line" /> MORE THAN THE HEADLINES</div><h2>The world is more<br />than what&apos;s <em>trending.</em></h2></div><div className="about-strip-end"><p>We put the people, places and perspectives behind the news back in the picture.</p><button className="text-button" onClick={onRead}>Meet Nomi <ArrowRight size={15} /></button></div></section>
}

function AboutPage({ onContact }) {
  return <section className="about-page"><div className="about-story"><div className="about-photo"><img src="https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=85" alt="Sunlight filtering through a living forest" /></div><div className="about-copy"><div className="eyebrow"><span className="eyebrow-line" /> OUR POINT OF VIEW</div><h2>Listen beyond<br />the <em>loudest.</em></h2><p>There is no shortage of news. There is a shortage of space to take it in. Nomi News brings together reporting from publishers around the world and makes the wider picture a little easier to see.</p><p>We are curious about the connections between people, place and possibility. Our job is to help you find a story worth following, then point you back to the newsroom that reported it.</p><button className="primary-button" onClick={onContact}>Talk with our team <ArrowRight size={15} /></button></div></div><div className="values-row"><div><span>01</span><h3>Many voices</h3><p>A world of perspectives starts with looking beyond one point of view.</p></div><div><span>02</span><h3>Open horizons</h3><p>We follow the connections between local events and the bigger picture.</p></div><div><span>03</span><h3>Room to think</h3><p>Context gives a headline somewhere meaningful to land.</p></div></div></section>
}

function ContactPage({ onSubmit, status }) {
  const isSuccess = status === 'sent'
  return <section className="contact-page"><div className="contact-details"><span className="contact-number">01 — 05</span><h2>Every good story<br />starts with <em>someone.</em></h2><p>Reach our small editorial team directly. We read every message, and we love hearing from people who care about getting the story right.</p><a className="contact-email" href="mailto:hello@nominews.com">hello@nominews.com <ArrowUpRight size={15} /></a><div className="contact-hours"><span className="live-dot" /> INDEPENDENTLY CURIOUS, EVERYWHERE</div></div><form className="contact-form" onSubmit={onSubmit}><div className="form-row"><label>Your name<input name="name" required maxLength="100" placeholder="How should we address you?" /></label><label>Email address<input name="email" type="email" required maxLength="200" placeholder="you@example.com" /></label></div><label>What&apos;s this about?<span className="select-wrap"><select name="subject" required defaultValue=""><option value="" disabled>Choose a subject</option><option>Story tip</option><option>Press & partnerships</option><option>Feedback</option><option>Something else</option></select><ChevronDown size={16} /></span></label><label>Your message<textarea name="message" required rows="5" maxLength="3000" placeholder="Tell us what’s on your mind..." /></label><div className="form-end"><button className="primary-button" type="submit" disabled={status === 'sending' || isSuccess}>{isSuccess ? 'Message sent' : status === 'sending' ? 'Sending...' : 'Send your note'}{isSuccess ? <Check size={16} /> : <ArrowRight size={16} />}</button><span className={`form-feedback${status === 'error' || status === 'offline' ? ' form-error' : ''}`}>{isSuccess ? 'Thanks for reaching out. Your note is with our team.' : status === 'offline' ? 'The server is offline right now. Please try again soon.' : status === 'error' ? 'Your message could not be sent. Please try again.' : 'Every note lands with a real person.'}</span></div></form></section>
}

export default App

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MessageSquare, Search } from 'lucide-react'
import { PublicFooter } from '@/components/shared/PublicFooter'
import { RuxMark } from '@/components/shared/RuxMascot'
import { SEOHead } from '@/components/shared/SEOHead'
import { blogPosts, type BlogPost } from '@/data/blogPosts'

const ALL_TAGS = Array.from(new Set(blogPosts.flatMap((p) => p.tags))).sort()

function BlogIndex() {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = blogPosts.filter((post) => {
    const matchesSearch = !search || post.title.toLowerCase().includes(search.toLowerCase()) || post.description.toLowerCase().includes(search.toLowerCase()) || post.question.toLowerCase().includes(search.toLowerCase())
    const matchesTag = !activeTag || post.tags.includes(activeTag)
    return matchesSearch && matchesTag
  })

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#FF4F00] selection:text-white">
      <SEOHead
        title="Trade Finance Rules Blog — TFRules"
        description="Expert explanations of UCP600, ISBP745, sanctions, FTAs, and trade compliance rules — with exact citations. No opinion, just rules."
        path="/blog"
      />

      {/* ── HERO ── */}
      <section className="relative w-full bg-[#050B14] overflow-hidden pt-6 pb-32 md:pb-40">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#FF4F00]/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

        {/* Nav */}
        <header className="relative z-30 mx-auto max-w-7xl px-6 lg:px-12 flex items-center justify-between pb-12">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-white"><RuxMark className="w-6 h-6 border-none" /></div>
            <span className="text-xl font-medium tracking-tight text-white">tfrules</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/pricing" className="text-[13px] font-medium text-neutral-400 hover:text-white uppercase tracking-widest transition">Pricing</Link>
            <Link to="/faq" className="text-[13px] font-medium text-neutral-400 hover:text-white uppercase tracking-widest transition">FAQ</Link>
            <Link to="/chat" className="h-10 px-5 flex items-center justify-center rounded-sm bg-[#FF4F00] text-[12px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-xl shadow-[#FF4F00]/20">
              Console &rarr;
            </Link>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-20 mx-auto max-w-7xl px-6 lg:px-12 pt-12 md:pt-20">
          <div className="max-w-4xl">
            <p className="inline-block mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4F00] border border-[#FF4F00]/20 bg-[#FF4F00]/10 px-4 py-1.5 rounded-sm">
              Trade Finance Rules — Explained
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-[80px] lg:text-[100px] font-bold tracking-tighter uppercase text-white leading-[0.9]">
              The Blog
            </h1>
            <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-neutral-400 font-light border-l border-[#FF4F00]/50 pl-5">
              {blogPosts.length} expert answers to real trade finance questions — each one grounded in exact rule citations. No opinion. No filler.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEARCH + FILTERS ── */}
      <div className="relative z-30 mx-auto max-w-7xl px-6 lg:px-12 -mt-12">
        <div className="bg-white border border-neutral-200 rounded-sm shadow-2xl p-6 md:p-8">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search articles — try 'partial shipments' or 'sanctions'"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-[15px] bg-neutral-50 border border-neutral-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/30 focus:border-[#FF4F00]/50 transition placeholder:text-neutral-400"
            />
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm border transition ${
                !activeTag
                  ? 'bg-[#050B14] text-white border-[#050B14]'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              All ({blogPosts.length})
            </button>
            {ALL_TAGS.map((tag) => {
              const count = blogPosts.filter((p) => p.tags.includes(tag)).length
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm border transition ${
                    activeTag === tag
                      ? 'bg-[#FF4F00] text-white border-[#FF4F00]'
                      : 'bg-white text-neutral-500 border-neutral-200 hover:border-[#FF4F00]/50 hover:text-[#FF4F00]'
                  }`}
                >
                  {tag} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ARTICLES GRID ── */}
      <main className="mx-auto max-w-7xl px-6 lg:px-12 py-16">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-neutral-400">No articles match your search.</p>
            <button onClick={() => { setSearch(''); setActiveTag(null) }} className="mt-4 text-[#FF4F00] font-semibold hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col rounded-sm border border-neutral-200 bg-white hover:border-[#FF4F00]/30 hover:shadow-lg hover:shadow-[#FF4F00]/5 transition-all duration-300 overflow-hidden"
              >
                {/* Tag bar */}
                <div className="px-5 pt-5 pb-0 flex items-center gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#FF4F00] bg-[#FF4F00]/10 px-2 py-0.5 rounded-sm">{tag}</span>
                  ))}
                </div>

                {/* Content */}
                <div className="px-5 pt-3 pb-5 flex-1 flex flex-col">
                  <h2 className="text-[16px] font-semibold leading-snug text-neutral-900 group-hover:text-[#FF4F00] transition line-clamp-3">{post.title}</h2>
                  <p className="mt-2 text-sm text-neutral-500 line-clamp-2 flex-1">{post.description}</p>
                </div>

                {/* Bottom bar */}
                <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">{post.citations.length} citations</span>
                  <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-[#FF4F00] transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ── CTA SECTION ── */}
      <section className="bg-[#050B14] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4F00] mb-4">Have a specific question?</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight uppercase">
            Ask tfrules directly
          </h2>
          <p className="mt-4 text-lg text-neutral-400 font-light max-w-lg mx-auto">
            Get a cited answer in seconds, not hours. No account needed.
          </p>
          <Link
            to="/chat"
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-[#FF4F00] px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-lg shadow-[#FF4F00]/20"
          >
            <MessageSquare className="h-4 w-4" /> Ask your question
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}

function BlogPostPage({ post }: { post: BlogPost }) {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#FF4F00] selection:text-white">
      <SEOHead
        title={`${post.title} — TFRules`}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
      />

      {/* ── HERO ── */}
      <section className="relative w-full bg-[#050B14] overflow-hidden pt-6 pb-28">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#FF4F00]/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

        <header className="relative z-30 mx-auto max-w-7xl px-6 lg:px-12 flex items-center justify-between pb-12">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-white"><RuxMark className="w-6 h-6 border-none" /></div>
            <span className="text-xl font-medium tracking-tight text-white">tfrules</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/blog" className="text-[13px] font-medium text-neutral-400 hover:text-white uppercase tracking-widest transition">All Articles</Link>
            <Link to="/chat" className="h-10 px-5 flex items-center justify-center rounded-sm bg-[#FF4F00] text-[12px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-xl shadow-[#FF4F00]/20">
              Console &rarr;
            </Link>
          </nav>
        </header>

        <div className="relative z-20 mx-auto max-w-4xl px-6 lg:px-12 pt-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition mb-8">
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
          <div className="flex items-center gap-2 mb-5">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#FF4F00] bg-[#FF4F00]/10 px-2.5 py-1 rounded-sm">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">{post.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-neutral-400 font-light border-l border-[#FF4F00]/50 pl-5">{post.description}</p>
        </div>
      </section>

      {/* ── ARTICLE BODY ── */}
      <main className="relative z-30 mx-auto max-w-4xl px-6 -mt-12 pb-20">
        <article className="bg-white border border-neutral-200 rounded-sm shadow-2xl overflow-hidden">
          {/* The question */}
          <div className="px-6 md:px-10 pt-8 pb-6 border-b border-neutral-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">The Question</p>
            <p className="text-lg font-medium text-neutral-900 italic leading-relaxed">"{post.question}"</p>
          </div>

          {/* The answer */}
          <div className="px-6 md:px-10 py-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-4">The Answer</p>
            <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed">
              {post.answer.split('\n\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-neutral-700">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Citations */}
          {post.citations.length > 0 && (
            <div className="px-6 md:px-10 py-6 bg-neutral-50 border-t border-neutral-100">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Referenced Rules</p>
              <ul className="space-y-1.5">
                {post.citations.map((cite, i) => (
                  <li key={i} className="text-sm text-neutral-600 font-mono">{cite}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 md:px-10 py-8 bg-[#050B14] text-center">
            <p className="text-lg font-semibold text-white mb-2">Have a specific question?</p>
            <p className="text-sm text-neutral-400 mb-5">Ask tfrules — get a cited answer in seconds, not hours.</p>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-sm bg-[#FF4F00] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-lg shadow-[#FF4F00]/20"
            >
              <MessageSquare className="h-4 w-4" /> Ask your question
            </Link>
          </div>
        </article>
      </main>

      <PublicFooter />
    </div>
  )
}

export function Blog() {
  const { slug } = useParams()

  if (!slug) return <BlogIndex />

  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) return <BlogIndex />

  return <BlogPostPage post={post} />
}

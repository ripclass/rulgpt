import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react'
import { PublicFooter } from '@/components/shared/PublicFooter'
import { RuxMark } from '@/components/shared/RuxMascot'
import { blogPosts, type BlogPost } from '@/data/blogPosts'

function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] transition-colors">
      <header className="bg-[#050B14] py-16 pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <Link to="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition">
            <RuxMark className="w-6 h-6 border-none" />
            <span className="text-xl font-medium tracking-tight text-white">tfrules</span>
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4F00] mb-4">Trade Finance Rules — Explained</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            The rules that govern global trade,<br />
            <span className="text-neutral-400">explained with exact citations.</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 -mt-16 pb-20">
        <div className="grid gap-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 p-6 hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#FF4F00] bg-[#FF4F00]/10 px-2 py-0.5 rounded-sm">{tag}</span>
                    ))}
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-[#FF4F00] transition">{post.title}</h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{post.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-300 group-hover:text-[#FF4F00] shrink-0 mt-1 transition" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

function BlogPostPage({ post }: { post: BlogPost }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] transition-colors">
      <header className="bg-[#050B14] py-12 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition mb-8">
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
          <div className="flex items-center gap-2 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#FF4F00] bg-[#FF4F00]/10 px-2 py-0.5 rounded-sm">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">{post.title}</h1>
          <p className="mt-4 text-lg text-neutral-400 font-light">{post.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 -mt-12 pb-20">
        <article className="rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 shadow-lg overflow-hidden">
          {/* The question */}
          <div className="px-6 md:px-10 pt-8 pb-6 border-b border-neutral-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">The Question</p>
            <p className="text-lg font-medium text-neutral-900 dark:text-white italic">"{post.question}"</p>
          </div>

          {/* The answer */}
          <div className="px-6 md:px-10 py-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-4">The Answer</p>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-relaxed">
              {post.answer.split('\n\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-neutral-700 dark:text-neutral-300">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Citations */}
          {post.citations.length > 0 && (
            <div className="px-6 md:px-10 py-6 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-100 dark:border-white/5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Referenced Rules</p>
              <ul className="space-y-1">
                {post.citations.map((cite, i) => (
                  <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">{cite}</li>
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
              className="inline-flex items-center gap-2 rounded-sm bg-[#FF4F00] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600]"
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

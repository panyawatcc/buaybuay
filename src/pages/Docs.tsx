import { useEffect, useMemo, useRef, useState, Children, isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Check, Copy, Home, List, X } from 'lucide-react';
import guideMarkdown from './docs/customer-guide.md?raw';
import tosMarkdown from './docs/tos.md?raw';
import dpaMarkdown from './docs/dpa.md?raw';
import aiInstallMarkdown from './docs/ai-install.md?raw';
import manualInstallMarkdown from './docs/manual-install.md?raw';

interface DocConfig {
  title: string;
  markdown: string;
}

const DOCS: Record<string, DocConfig> = {
  '/docs': { title: 'AdsPanda AI Docs', markdown: guideMarkdown },
  '/docs/ai-install': { title: 'AI-Assisted Install', markdown: aiInstallMarkdown },
  '/docs/manual-install': { title: 'Manual Install', markdown: manualInstallMarkdown },
  '/docs/tos': { title: 'Terms of Service', markdown: tosMarkdown },
  '/docs/dpa': { title: 'Data Processing Agreement', markdown: dpaMarkdown },
};

const DOC_SIBLING_LINKS = [
  { to: '/docs', label: 'คู่มือ' },
  { to: '/docs/ai-install', label: 'AI Install' },
  { to: '/docs/manual-install', label: 'Manual' },
  { to: '/docs/tos', label: 'Terms' },
  { to: '/docs/dpa', label: 'DPA' },
];

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const headings: Heading[] = [];
  let inCodeFence = false;
  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (match) {
      const level = match[1].length as 2 | 3;
      const text = match[2].replace(/\s*\{#.+?\}\s*$/, '').trim();
      headings.push({ id: slugify(text), text, level });
    }
  }
  return headings;
}

function extractCodeText(node: React.ReactNode): string {
  let text = '';
  Children.forEach(node, (child) => {
    if (typeof child === 'string') text += child;
    else if (isValidElement(child)) text += extractCodeText((child.props as { children?: React.ReactNode }).children);
  });
  return text;
}

function CodeBlock({ language, children }: { language?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const rawText = useMemo(() => extractCodeText(children).replace(/\n$/, ''), [children]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="group relative my-4 rounded-lg bg-surface-light border border-surface-lighter overflow-hidden">
      {language && (
        <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-text-muted border-b border-surface-lighter bg-surface">
          {language}
        </div>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-surface/80 hover:bg-primary/20 text-text-muted hover:text-primary-light border border-surface-lighter opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="px-4 py-3 overflow-x-auto text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
}

function extractLeadText(node: React.ReactNode): string {
  let text = '';
  Children.forEach(node, (child) => {
    if (typeof child === 'string') text += child;
    else if (isValidElement(child)) text += extractLeadText((child.props as { children?: React.ReactNode }).children);
  });
  return text;
}


function Blockquote({ children }: { children?: React.ReactNode }) {
  const lead = extractLeadText(children).trimStart();
  if (lead.startsWith('🚨')) {
    return (
      <blockquote className="my-4 rounded-lg border-l-4 border-danger bg-danger/10 p-4 text-sm text-text">
        {children}
      </blockquote>
    );
  }
  if (lead.startsWith('ℹ️') || lead.startsWith('ℹ')) {
    return (
      <blockquote className="my-4 rounded-lg border-l-4 border-info bg-info/10 p-4 text-sm text-text">
        {children}
      </blockquote>
    );
  }
  if (lead.startsWith('⏳') || lead.startsWith('⚠️') || lead.startsWith('⚠')) {
    return (
      <blockquote className="my-4 rounded-lg border-l-4 border-warning bg-warning/10 p-4 text-sm text-text">
        {children}
      </blockquote>
    );
  }
  if (lead.startsWith('💡')) {
    return (
      <blockquote className="my-4 rounded-lg border-l-4 border-primary-light bg-primary/10 p-4 text-sm text-text">
        {children}
      </blockquote>
    );
  }
  if (lead.startsWith('✅')) {
    return (
      <blockquote className="my-4 rounded-lg border-l-4 border-success bg-success/10 p-4 text-sm text-text">
        {children}
      </blockquote>
    );
  }
  return (
    <blockquote className="my-4 rounded-lg border-l-4 border-surface-lighter bg-surface-light/40 p-4 text-sm text-text-muted">
      {children}
    </blockquote>
  );
}

export default function Docs() {
  const location = useLocation();
  const doc = DOCS[location.pathname] ?? DOCS['/docs'];
  const markdown = doc.markdown;
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveId('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top));
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] },
    );
    const nodes = contentRef.current?.querySelectorAll('h2, h3') ?? [];
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [headings.length]);

  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top bar (public — minimal) */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur border-b border-surface-lighter">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/docs" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="w-5 h-5 text-primary-light" />
            <span>{doc.title}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {DOC_SIBLING_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-2 py-1 rounded ${
                  location.pathname === l.to
                    ? 'bg-primary/20 text-primary-light font-medium'
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileTocOpen((v) => !v)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-surface hover:bg-surface-light"
              aria-label="Toggle table of contents"
            >
              {mobileTocOpen ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span className="hidden sm:inline">สารบัญ</span>
            </button>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sticky TOC */}
        <aside
          className={`${
            mobileTocOpen ? 'block' : 'hidden'
          } lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto`}
        >
          <nav className="bg-surface rounded-xl p-4 text-sm">
            <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2 flex items-center gap-1.5">
              <List className="w-3 h-3" /> สารบัญ
            </p>
            <ul className="space-y-0.5">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'ml-3' : ''}>
                  <a
                    href={`#${h.id}`}
                    onClick={() => setMobileTocOpen(false)}
                    className={`block py-1 px-2 rounded-md leading-snug transition-colors ${
                      activeId === h.id
                        ? 'bg-primary/20 text-primary-light font-medium'
                        : 'text-text-muted hover:text-text hover:bg-surface-light'
                    } ${h.level === 3 ? 'text-xs' : 'text-sm'}`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Markdown body */}
        <article ref={contentRef} className="markdown-content min-w-0 max-w-3xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeRaw,
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'wrap' }],
            ]}
            components={{
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-surface-light text-primary-light text-[0.9em] font-mono">
                      {children}
                    </code>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              },
              pre: (props) => {
                const { children } = props as { children?: React.ReactNode };
                const first = Array.isArray(children) ? children[0] : children;
                if (isValidElement(first)) {
                  const cn = ((first.props as { className?: string }).className || '').trim();
                  const lang = cn.replace(/^language-/, '') || undefined;
                  const inner = (first.props as { children?: React.ReactNode }).children;
                  return <CodeBlock language={lang}>{inner}</CodeBlock>;
                }
                return <CodeBlock>{children}</CodeBlock>;
              },
              blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
              // External links (http://, https://, //, mailto:, tel:) open in
              // a new tab so customers don't lose their place in the docs
              // when clicking out to git-scm.com / nodejs.org / cloudflare
              // dashboard. Internal links (/docs/*, #anchor, plain paths)
              // stay in-tab so sibling-doc nav + in-page anchors keep the
              // SPA state. rel="noopener noreferrer" guards against
              // window.opener tab-nabbing.
              a: ({ href, children, ...props }) => {
                const isExternal = typeof href === 'string'
                  && /^(https?:)?\/\/|^mailto:|^tel:/i.test(href);
                return (
                  <a
                    href={href}
                    {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { sanitizeSchema } from '@/lib/markdown-utils';
import type { Components } from 'react-markdown';

interface NewsletterRendererProps {
  content: string;
  className?: string;
}

/**
 * Custom component renderers for markdown elements
 * Applies InovIntell branding and professional styling
 */
const components: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-4xl font-bold mb-4 mt-8 bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-3xl font-bold mb-3 mt-6 text-blue-600"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-2xl font-semibold mb-2 mt-5 text-sky-700"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="text-xl font-semibold mb-2 mt-4 text-sky-800"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="text-lg font-semibold mb-2 mt-3 text-gray-800"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="text-base font-semibold mb-2 mt-3 text-gray-700"
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ children, ...props }) => (
    <p
      className="mb-4 leading-relaxed text-gray-800"
      {...props}
    >
      {children}
    </p>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-blue-500 hover:text-blue-700 hover:underline transition-colors duration-200"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="list-disc list-outside ml-6 mb-4 space-y-2"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="list-decimal list-outside ml-6 mb-4 space-y-2"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      className="leading-relaxed text-gray-800"
      {...props}
    >
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-green-500 pl-4 py-2 my-4 italic text-gray-600 bg-gray-50 rounded-r"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ inline, children, className, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={`${className || ''} text-gray-100 font-mono text-sm`}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-700"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto mb-4">
      <table
        className="min-w-full divide-y divide-gray-300 border border-gray-300"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      className="bg-gray-100"
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody
      className="divide-y divide-gray-200 bg-white"
      {...props}
    >
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="px-4 py-3 text-sm text-gray-700"
      {...props}
    >
      {children}
    </td>
  ),
  hr: ({ ...props }) => (
    <hr
      className="my-8 border-t-2 border-gray-200"
      {...props}
    />
  ),
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt || ''}
      className="max-w-full h-auto rounded-lg my-4 shadow-md"
      {...props}
    />
  ),
  del: ({ children, ...props }) => (
    <del
      className="line-through text-gray-500"
      {...props}
    >
      {children}
    </del>
  ),
  strong: ({ children, ...props }) => (
    <strong
      className="font-bold text-gray-900"
      {...props}
    >
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em
      className="italic text-gray-800"
      {...props}
    >
      {children}
    </em>
  ),
};

/**
 * NewsletterRenderer component
 * Renders markdown content as beautifully formatted HTML
 * with professional typography and InovIntell branding
 */
const NewsletterRenderer: React.FC<NewsletterRendererProps> = memo(({ content, className = '' }) => {
  if (!content || content.trim() === '') {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No content to display</p>
      </div>
    );
  }

  return (
    <div className={`newsletter-renderer prose prose-lg max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

NewsletterRenderer.displayName = 'NewsletterRenderer';

export default NewsletterRenderer;

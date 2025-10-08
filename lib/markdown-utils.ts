/**
 * Markdown processing utilities for newsletter rendering
 */

import { defaultSchema } from 'rehype-sanitize';
import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';

/**
 * Sanitization schema for markdown HTML output
 * Allows safe HTML elements while preventing XSS attacks
 */
export const sanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow additional attributes for better styling
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style'],
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // Ensure common markdown elements are allowed
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'em', 'del', 'ins',
    'a', 'code', 'pre',
    'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'div', 'span',
  ],
};

/**
 * Generate a standalone HTML document from markdown content
 * @param content - The markdown content to convert
 * @param title - Document title
 * @returns Complete HTML document string
 */
export function generateStandaloneHTML(content: string, title: string = 'Newsletter'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #1f2937;
      background: #ffffff;
    }
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 {
      font-size: 2.25rem;
      background: linear-gradient(to right, #0EA5E9, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h2 {
      font-size: 1.875rem;
      color: #0EA5E9;
    }
    h3 {
      font-size: 1.5rem;
      color: #0284c7;
    }
    h4 {
      font-size: 1.25rem;
      color: #0369a1;
    }
    a {
      color: #0EA5E9;
      text-decoration: none;
      transition: color 0.2s;
    }
    a:hover {
      color: #0284c7;
      text-decoration: underline;
    }
    ul, ol {
      padding-left: 1.5rem;
      margin: 1rem 0;
    }
    li {
      margin: 0.5rem 0;
    }
    code {
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875em;
      font-family: 'Courier New', Courier, monospace;
    }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 4px solid #10B981;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #4b5563;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
    }
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2rem 0;
    }
    @media print {
      body {
        max-width: 100%;
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Extract plain text from markdown (removes formatting)
 * @param markdown - Markdown content
 * @returns Plain text without markdown syntax
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Truncate text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Count words in text
 * @param text - Text to count words in
 * @returns Word count
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate reading time in minutes
 * @param text - Text to estimate reading time for
 * @param wordsPerMinute - Average reading speed (default: 200)
 * @returns Estimated reading time in minutes
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

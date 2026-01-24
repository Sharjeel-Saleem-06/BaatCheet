/**
 * Markdown Renderer Component
 * Beautiful rendering of AI responses with custom styling
 * Supports tables, code blocks, lists, LaTeX math, and more
 */

import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  text: 'Text',
};

// Simple syntax highlighting (without external library)
function highlightCode(code: string, language: string): React.ReactNode {
  // Basic keyword highlighting for common languages
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'raise', 'with', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'void', 'int', 'String', 'boolean', 'static', 'final'],
    sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'NULL', 'AS'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'echo', 'exit', 'export', 'source', 'cd', 'ls', 'rm', 'cp', 'mv', 'mkdir', 'chmod', 'chown', 'grep', 'sed', 'awk'],
  };

  const langKeywords = keywords[language] || keywords.javascript || [];
  
  // Split code into lines for processing
  const lines = code.split('\n');
  
  return (
    <code className="block">
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className="code-line">
          {highlightLine(line, langKeywords)}
        </div>
      ))}
    </code>
  );
}

function highlightLine(line: string, keywords: string[]): React.ReactNode {
  // Simple tokenization
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    let matched = false;

    // Check for string literals
    const stringMatch = remaining.match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
    if (stringMatch) {
      parts.push(
        <span key={key++} className="text-emerald-400">
          {stringMatch[0]}
        </span>
      );
      remaining = remaining.slice(stringMatch[0].length);
      matched = true;
      continue;
    }

    // Check for comments
    const commentMatch = remaining.match(/^(\/\/.*|#.*|--.*)/);
    if (commentMatch) {
      parts.push(
        <span key={key++} className="text-slate-500 italic">
          {commentMatch[0]}
        </span>
      );
      remaining = remaining.slice(commentMatch[0].length);
      matched = true;
      continue;
    }

    // Check for numbers
    const numberMatch = remaining.match(/^\b\d+\.?\d*\b/);
    if (numberMatch) {
      parts.push(
        <span key={key++} className="text-amber-400">
          {numberMatch[0]}
        </span>
      );
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }

    // Check for keywords
    for (const keyword of keywords) {
      const regex = new RegExp(`^\\b${keyword}\\b`, 'i');
      const keywordMatch = remaining.match(regex);
      if (keywordMatch) {
        parts.push(
          <span key={key++} className="text-purple-400 font-medium">
            {keywordMatch[0]}
          </span>
        );
        remaining = remaining.slice(keywordMatch[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check for function calls
      const funcMatch = remaining.match(/^(\w+)\s*\(/);
      if (funcMatch) {
        parts.push(
          <span key={key++} className="text-blue-400">
            {funcMatch[1]}
          </span>
        );
        parts.push(<span key={key++}>(</span>);
        remaining = remaining.slice(funcMatch[0].length);
        continue;
      }

      // Default: add single character
      parts.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return parts;
}

// Code Block Component with copy button
function CodeBlock({ 
  language, 
  children 
}: { 
  language: string; 
  children: string;
}) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [children]);

  const lineCount = children.split('\n').length;
  const isLong = lineCount > 20;
  const displayName = LANGUAGE_NAMES[language] || language || 'Code';

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700 border-b border-slate-600">
        <div className="flex items-center gap-2">
          {/* Language badge */}
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-600 text-slate-200">
            {displayName}
          </span>
          {/* Line count */}
          <span className="text-xs text-slate-400">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Collapse button for long code */}
          {isLong && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all',
              copied
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white'
            )}
          >
            {copied ? (
              <>
                <Check size={12} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Code content */}
      <div 
        className={clsx(
          'overflow-x-auto',
          collapsed && 'max-h-24 overflow-y-hidden'
        )}
      >
        <pre className="p-4 text-sm font-mono text-slate-100 leading-relaxed">
          {highlightCode(children, language)}
        </pre>
      </div>
      
      {/* Collapsed indicator */}
      {collapsed && isLong && (
        <div 
          className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-700/50 cursor-pointer hover:bg-slate-700"
          onClick={() => setCollapsed(false)}
        >
          Click to expand ({lineCount - 5} more lines)
        </div>
      )}
    </div>
  );
}

// Process content to handle LaTeX delimiters
function preprocessContent(content: string): string {
  // Convert $$ ... $$ to proper math blocks
  let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    return `\n$$${math.trim()}$$\n`;
  });
  
  // Convert single $ ... $ to inline math (but not $$)
  processed = processed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, math) => {
    return `$${math.trim()}$`;
  });
  
  return processed;
}

// Main Markdown Renderer
export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Preprocess content for LaTeX
  const processedContent = useMemo(() => preprocessContent(content), [content]);
  
  return (
    <div className={clsx('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-slate-800 border-b border-slate-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-slate-800">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-slate-700">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 text-slate-700">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-slate-700">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="mb-4 ml-4 space-y-1.5 list-disc list-outside marker:text-emerald-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-4 space-y-1.5 list-decimal list-outside marker:text-emerald-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-slate-700 pl-1">
              {children}
            </li>
          ),
          
          // Tables - Light theme styling
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-xl border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-r border-slate-200 last:border-r-0">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-100 last:border-r-0">
              {children}
            </td>
          ),
          
          // Code blocks
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            
            if (isInline) {
              // Inline code
              return (
                <code 
                  className="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-600 text-sm font-mono border border-slate-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            // Code block
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');
            
            return <CodeBlock language={language}>{codeString}</CodeBlock>;
          },
          
          // Pre (wrapper for code blocks)
          pre: ({ children }) => <>{children}</>,
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 mb-4 italic text-slate-600 bg-emerald-50/50 rounded-r-lg">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href}
              className="text-emerald-600 hover:text-emerald-500 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-slate-800">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-600">
              {children}
            </em>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-slate-200" />
          ),
          
          // Images
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt || ''} 
              className="max-w-full h-auto rounded-lg my-4 border border-slate-200 shadow-sm"
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Export named component as well
export { MarkdownRenderer };

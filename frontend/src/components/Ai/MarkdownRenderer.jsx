import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="ai-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="ai-markdown-link"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="ai-inline-code" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="ai-code-block">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children, ...props }) => (
            <div className="ai-table-wrapper">
              <table className="ai-table" {...props}>
                {children}
              </table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

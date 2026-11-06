import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The Markdown parser is downloaded only when the chat window is opened.
export default function ChatMessage({ children }: { children: string }) {
  // Generated/user Markdown must not automatically fetch image URLs or tracking pixels.
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ alt }) => <span>{alt}</span> }}>{children}</ReactMarkdown>;
}

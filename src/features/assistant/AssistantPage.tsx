import { FormEvent, useMemo, useState } from 'react';
import { Bot, Send, Sparkles, UserRound } from 'lucide-react';
import { Badge, Button, Card, PageHeader, inputClass } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import {
  buildPortfolioAgentSnapshot,
  redactQuestionForModel,
  redactSnapshotForModel
} from '../../lib/agent/portfolioContext';
import { formatCurrency } from '../../lib/format';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: string;
  truncated?: boolean;
};

const starterPrompts = [
  'Summarize my portfolio health and top risks.',
  'Can I afford school fees of 3.5L per annum for the next 10 years?',
  'Which deposits or policies need attention soon?',
  'What happens to my net worth if I add a 25,000 monthly SIP?'
];

export function AssistantPage() {
  const { user } = useAuth();
  const { members, loading: membersLoading } = useMembers();
  const { instruments, loading: instrumentsLoading } = useInstruments();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const snapshot = useMemo(() => {
    if (!user) return undefined;
    return buildPortfolioAgentSnapshot({ user, members, instruments });
  }, [instruments, members, user]);

  const submit = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    if (!snapshot || loading) return;
    const nextQuestion = (prompt ?? question).trim();
    if (!nextQuestion) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: nextQuestion
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/portfolio-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: redactQuestionForModel(nextQuestion, snapshot),
          snapshot: redactSnapshotForModel(snapshot)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assistant request failed');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          meta: `${data.provider} · ${data.model}`,
          truncated: Boolean(data.truncated)
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Assistant request failed');
    } finally {
      setLoading(false);
    }
  };

  const disabled = membersLoading || instrumentsLoading || !snapshot;

  return (
    <>
      <PageHeader
        title="Portfolio Assistant"
        subtitle="Ask portfolio questions, run what-if scenarios, and pressure-test obligations using your saved family finance data."
      />

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-700" />
              <h2 className="font-bold text-slate-950">Snapshot</h2>
            </div>
            {snapshot ? (
              <div className="mt-4 space-y-3 text-sm">
                <SnapshotLine label="Net worth" value={formatCurrency(snapshot.totals.netWorth, user?.currency)} />
                <SnapshotLine label="Assets" value={formatCurrency(snapshot.totals.assets, user?.currency)} />
                <SnapshotLine label="Liabilities" value={formatCurrency(snapshot.totals.liabilities, user?.currency)} />
                <SnapshotLine label="Monthly commitments" value={formatCurrency(snapshot.totals.monthlyCommitments, user?.currency)} />
                <div className="pt-2">
                  <Badge tone={snapshot.settings.autoRenewDeposits ? 'teal' : 'slate'}>
                    FD/RD auto-renew {snapshot.settings.autoRenewDeposits ? 'on' : 'off'}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Loading portfolio data...</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-bold text-slate-950">Try</h2>
            <div className="mt-3 space-y-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(undefined, prompt)}
                  disabled={disabled || loading}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-950">Ask about your family portfolio</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                    Answers are grounded in your saved instruments, members, projections, and obligations.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {loading ? (
              <MessageBubble
                message={{
                  id: 'loading',
                  role: 'assistant',
                  content: 'Thinking through the portfolio...',
                  meta: 'working'
                }}
              />
            ) : null}
          </div>

          {error ? <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

          <form onSubmit={submit} className="border-t border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={disabled || loading}
                placeholder="Ask a portfolio or what-if question"
              />
              <Button type="submit" loading={loading} disabled={disabled || !question.trim()}>
                <Send className="h-4 w-4" />
                Ask
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Educational output only. Names, IDs, descriptions, and institution details are redacted before model access.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}

function SnapshotLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-950">{value}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const Icon = isUser ? UserRound : Bot;
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className={`max-w-3xl rounded-lg px-4 py-3 ${isUser ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <MarkdownText content={message.content} inverted={isUser} />
        {message.truncated ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            The provider stopped at its output limit. Ask a narrower follow-up for more detail.
          </p>
        ) : null}
        {message.meta ? <p className={`mt-2 text-xs ${isUser ? 'text-teal-50' : 'text-slate-500'}`}>{message.meta}</p> : null}
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

function MarkdownText({ content, inverted = false }: { content: string; inverted?: boolean }) {
  const textClass = inverted ? 'text-white' : 'text-slate-900';
  const mutedClass = inverted ? 'text-teal-50' : 'text-slate-700';
  const lines = normalizeMarkdown(content).split('\n');

  return (
    <div className={`space-y-3 text-sm leading-6 ${textClass}`}>
      {groupLines(lines).map((block, index) => {
        const blockLines = block.lines;
        const firstLine = blockLines[0] ?? '';
        const heading = firstLine.match(/^#{1,3}\s+(.+)/);
        if (heading) {
          return (
            <h3 key={index} className="text-base font-bold">
              {renderInlineMarkdown(heading[1])}
            </h3>
          );
        }
        if (block.kind === 'separator') {
          return null;
        }
        if (block.kind === 'unordered') {
          return (
            <ul key={index} className={`list-disc space-y-1 pl-5 ${mutedClass}`}>
              {blockLines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'ordered') {
          return (
            <ol key={index} className={`list-decimal space-y-1 pl-5 ${mutedClass}`}>
              {blockLines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className={`whitespace-pre-wrap ${mutedClass}`}>
            {renderInlineMarkdown(blockLines.join('\n'))}
          </p>
        );
      })}
    </div>
  );
}

function normalizeMarkdown(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}\*\s+\*/gm, '- ')
    .replace(/^\s{0,3}\*\s+/gm, '- ')
    .replace(/^\s{0,3}[-*]{3,}\s*$/gm, '---')
    .trim();
}

function groupLines(lines: string[]) {
  const groups: { kind: 'heading' | 'ordered' | 'paragraph' | 'separator' | 'unordered'; lines: string[] }[] = [];
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const kind = line.startsWith('#')
      ? 'heading'
      : line === '---'
        ? 'separator'
        : /^[-*]\s+/.test(line)
          ? 'unordered'
          : /^\d+\.\s+/.test(line)
            ? 'ordered'
            : 'paragraph';
    const previous = groups[groups.length - 1];
    if (previous && previous.kind === kind && kind !== 'heading' && kind !== 'separator') {
      previous.lines.push(line);
    } else {
      groups.push({ kind, lines: [line] });
    }
  });
  return groups;
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={`${part}-${index}`} className="font-semibold">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

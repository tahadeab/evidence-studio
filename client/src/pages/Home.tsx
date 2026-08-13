import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { RESEARCH_PROVIDERS, type ResearchProvider } from "@shared/research";
import { jsPDF } from "jspdf";
import { Check, ChevronRight, Clipboard, Clock3, Download, FileText, KeyRound, Loader2, Plus, Search, Send, Settings2, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type ProviderDraft = { provider: ResearchProvider; model: string; apiKey: string };

const providerNames: Record<ResearchProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  groq: "Groq",
};

const defaultModels: Record<ResearchProvider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
};

const modelHints: Record<ResearchProvider, string[]> = {
  openai: ["gpt-4.1-mini", "gpt-4.1", "gpt-5-mini"],
  anthropic: ["claude-sonnet-4-5", "claude-opus-4-5"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro"],
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"],
};

const statusClasses = {
  running: "border-[#d8bf71] bg-[#fff8df] text-[#8b6615]",
  completed: "border-[#a6c9b5] bg-[#edf8f0] text-[#2d6c4a]",
  failed: "border-[#efb7b2] bg-[#fff0ef] text-[#a24138]",
};

function formatDate(value: Date | string | number) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function downloadText(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function downloadPdf(title: string, content: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 52;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const height = pdf.internal.pageSize.getHeight() - margin * 2;
  const lines = pdf.splitTextToSize(content.replace(/#{1,3}\s*/g, ""), width);
  let y = margin;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  lines.forEach((line: string) => {
    if (y > height + margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 15;
  });
  pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "research-report"}.pdf`);
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeResearchId, setActiveResearchId] = useState("");
  const [executionKeys, setExecutionKeys] = useState<Partial<Record<ResearchProvider, string>>>({});
  const [config, setConfig] = useState<ProviderDraft>({ provider: "openai", model: defaultModels.openai, apiKey: "" });

  const sessionsQuery = trpc.research.list.useQuery(undefined, { enabled: Boolean(user) });
  const preferenceQuery = trpc.research.preference.useQuery(undefined, { enabled: Boolean(user) });
  const detailQuery = trpc.research.detail.useQuery({ researchId: activeResearchId || "unselected" }, { enabled: Boolean(activeResearchId && user), refetchInterval: activeResearchId ? 1_500 : false });
  const reportQuery = trpc.research.report.useQuery({ researchId: activeResearchId || "unselected" }, { enabled: Boolean(activeResearchId && detailQuery.data?.task.status === "completed") });
  const launchMutation = trpc.research.launch.useMutation();
  const advanceMutation = trpc.research.advance.useMutation();
  const savePreferenceMutation = trpc.research.savePreference.useMutation();
  const verifyProviderMutation = trpc.research.verifyProvider.useMutation();
  const exportMarkdownQuery = trpc.research.exportMarkdown.useQuery({ researchId: activeResearchId || "unselected" }, { enabled: false });

  useEffect(() => {
    const preference = preferenceQuery.data;
    if (!preference) return;
    setConfig(current =>
      current.provider === "openai" && current.model === defaultModels.openai && !current.apiKey
        ? { provider: preference.provider, model: preference.model, apiKey: executionKeys[preference.provider] || "" }
        : current);
  }, [preferenceQuery.data, executionKeys]);

  useEffect(() => {
    const task = detailQuery.data?.task;
    if (!task || task.status !== "running" || advanceMutation.isPending) return;
    const provider = task.provider as ResearchProvider;
    const apiKey = executionKeys[provider];
    if (!apiKey) return;
    const timer = window.setTimeout(() => {
      advanceMutation.mutate({
        researchId: task.id,
        researchInput: {
          query: task.query,
          title: task.title,
          providerConfig: { provider, model: task.model, apiKey },
        },
      }, {
        onSuccess: () => { void detailQuery.refetch(); void sessionsQuery.refetch(); },
        onError: () => { void detailQuery.refetch(); void sessionsQuery.refetch(); },
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [detailQuery.data?.events.length, detailQuery.data?.task.status, detailQuery.data?.task.id, advanceMutation.isPending, executionKeys, detailQuery, sessionsQuery]);

  const sessions = sessionsQuery.data ?? [];
  const active = detailQuery.data;
  const counts = useMemo(() => ({
    running: sessions.filter(session => session.status === "running").length,
    completed: sessions.filter(session => session.status === "completed").length,
    failed: sessions.filter(session => session.status === "failed").length,
  }), [sessions]);
  const modelList = modelHints[config.provider];

  const selectProvider = (provider: ResearchProvider) => {
    setConfig({ provider, model: defaultModels[provider], apiKey: executionKeys[provider] || "" });
  };

  const saveConfig = () => {
    if (!config.model.trim()) return toast.error("Enter a model identifier.");
    if (config.apiKey.trim().length < 8) return toast.error("Enter a valid API key for the selected provider.");
    setExecutionKeys(current => ({ ...current, [config.provider]: config.apiKey.trim() }));
    savePreferenceMutation.mutate({ provider: config.provider, model: config.model.trim() }, {
      onSuccess: () => { setSettingsOpen(false); toast.success("Provider preference saved."); },
      onError: () => toast.error("The provider preference could not be saved."),
    });
  };

  const startResearch = () => {
    if (query.trim().length < 12) return toast.error("Enter a research question with at least 12 characters.");
    if (config.apiKey.trim().length < 8) {
      setSettingsOpen(true);
      return toast.error("Add an API key for the selected provider before starting.");
    }
    setExecutionKeys(current => ({ ...current, [config.provider]: config.apiKey.trim() }));
    launchMutation.mutate({
      query: query.trim(),
      title: title.trim() || undefined,
      providerConfig: { provider: config.provider, model: config.model.trim(), apiKey: config.apiKey.trim() },
    }, {
      onSuccess: ({ researchId }) => {
        setActiveResearchId(researchId);
        setQuery("");
        setTitle("");
        void sessionsQuery.refetch();
        toast.success("Research session started.");
      },
      onError: error => toast.error(error.message),
    });
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-5">
      <Button onClick={() => document.getElementById("research-composer")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="h-10 w-full justify-start gap-2 rounded-xl bg-[#0a2825] px-3 text-sm text-white shadow-sm hover:bg-[#123c37]">
        <Plus className="h-4 w-4" /> New research
      </Button>
      <div className="grid grid-cols-3 gap-1.5 px-1">
        {(["running", "completed", "failed"] as const).map(status => (
          <div key={status} className="rounded-lg bg-white px-1.5 py-2 text-center ring-1 ring-[#e4e9e3]">
            <p className="text-sm font-semibold text-[#253e38]">{counts[status]}</p>
            <p className="mt-0.5 text-[9px] font-semibold lowercase tracking-wide text-[#84918d]">{status}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#899792]">Research library</p>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-7 w-7 text-[#536a63] hover:bg-[#e9eee8]" aria-label="Open provider settings"><Settings2 className="h-4 w-4" /></Button>
      </div>
      <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
        <div className="space-y-1.5">
          {sessions.map(session => (
            <button key={session.id} onClick={() => setActiveResearchId(session.id)} className={`w-full rounded-xl border p-3 text-left transition-all ${activeResearchId === session.id ? "border-[#8ea853] bg-[#edf3e4] shadow-sm" : "border-transparent hover:border-[#dce4de] hover:bg-white"}`}>
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#78936a]" />
                <p className="line-clamp-2 flex-1 text-xs font-medium leading-5 text-[#26423b]">{session.title}</p>
              </div>
              <div className="mt-2 flex items-center justify-between pl-5.5">
                <Badge variant="outline" className={`rounded-md px-1.5 py-0 text-[9px] font-semibold lowercase ${statusClasses[session.status]}`}>{session.status}</Badge>
                <span className="text-[10px] text-[#82908b]">{formatDate(session.updatedAt)}</span>
              </div>
            </button>
          ))}
          {!sessionsQuery.isLoading && sessions.length === 0 && <p className="px-2 py-7 text-center text-xs leading-5 text-[#84918d]">Your completed research will remain available here.</p>}
        </div>
      </ScrollArea>
      <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#dce4de] bg-white px-3 py-2.5 text-left transition-colors hover:bg-[#f1f5ed]">
        <KeyRound className="h-4 w-4 text-[#78936a]" />
        <span className="text-xs font-medium text-[#37544b]">{providerNames[config.provider]}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#91a099]" />
      </button>
    </div>
  );

  return (
    <DashboardLayout sidebarContent={sidebar}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78936a]">Evidence-led workspace</p>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em] text-[#102522] sm:text-5xl">Clear thinking, <em className="font-serif text-[#557760]">grounded</em> research.</h1>
          </div>
          <div className="rounded-xl border border-[#dce4de] bg-white px-3 py-2 text-xs text-[#64756f] shadow-sm"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9aaf4f]" />{providerNames[config.provider]} · {config.model}</div>
        </header>

        <section id="research-composer" className="relative overflow-hidden rounded-2xl border border-[#d7e1d8] bg-[#0c2b27] p-5 shadow-[0_18px_45px_rgba(9,40,36,0.12)] sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-[#b4ca78]/20" />
          <div className="pointer-events-none absolute right-20 top-12 h-20 w-20 rounded-full bg-[#b4ca78]/10 blur-2xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-[#e6f2bc]"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">New line of inquiry</span></div>
            <Textarea value={query} onChange={event => setQuery(event.target.value)} placeholder="What would you like to investigate?" className="min-h-28 resize-none border-[#416058] bg-white/95 px-4 py-3 text-base text-[#17342f] placeholder:text-[#83938d] focus-visible:ring-[#b4ca78]" />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Optional working title" className="h-10 border-[#416058] bg-white/10 text-sm text-white placeholder:text-[#a8bbb4] focus-visible:ring-[#b4ca78] sm:max-w-xs" />
              <div className="flex flex-1 items-center justify-between gap-3">
                <button onClick={() => setSettingsOpen(true)} className="text-left text-xs text-[#c5d6d0] transition-colors hover:text-white"><span className="text-[#e6f2bc]">{providerNames[config.provider]}</span> · {config.model}</button>
                <Button onClick={startResearch} disabled={launchMutation.isPending} className="h-10 gap-2 rounded-xl bg-[#dceba6] px-4 text-sm font-semibold text-[#17342f] hover:bg-[#e8f5bd]">
                  {launchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Begin research
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.96fr_1.34fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e0e6df] bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
              <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78936a]">Research activity</p><h2 className="mt-1 font-serif text-2xl text-[#19342e]">{active?.task.title || "Start with a question"}</h2></div>{active?.task && <Badge variant="outline" className={`rounded-lg px-2 py-1 text-[10px] font-semibold lowercase ${statusClasses[active.task.status]}`}>{active.task.status}</Badge>}</div>
              <div className="mt-5 space-y-4">
                {!active && <div className="rounded-xl bg-[#f6f8f4] px-4 py-6 text-center"><Search className="mx-auto h-5 w-5 text-[#8aa072]" /><p className="mt-2 text-sm text-[#64756f]">Build a transparent research trail from the question to its sources.</p></div>}
                {active?.events.map((event, index) => {
                  const detail = event.detail as { subQueries?: string[]; sources?: Array<{ title: string; url: string }>; finding?: string } | null;
                  return <div key={event.id} className="relative pl-7"><div className={`absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ${event.type === "error" ? "bg-[#f8d9d6] text-[#a24138]" : "bg-[#e7f0d8] text-[#567847]"}`}>{event.type === "error" ? <TriangleAlert className="h-3 w-3" /> : <Check className="h-3 w-3" />}</div>{index < active.events.length - 1 && <div className="absolute left-[9px] top-6 h-[calc(100%+7px)] w-px bg-[#dce5da]" />}<p className="text-sm leading-5 text-[#36554c]">{event.message}</p>{detail?.subQueries && <ul className="mt-2 space-y-1 rounded-lg bg-[#f6f8f4] p-2.5 text-xs leading-5 text-[#62746d]">{detail.subQueries.map(item => <li key={item}>• {item}</li>)}</ul>}{detail?.finding && <p className="mt-2 rounded-lg border border-[#e0e8dc] bg-[#fbfcfa] p-2.5 text-xs leading-5 text-[#61736c]">{detail.finding}</p>}</div>;
                })}
                {active?.task.status === "running" && <div className="flex items-center gap-2 pl-7 text-xs text-[#78936a]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working through the next evidence step</div>}
                {active?.task.status === "running" && !executionKeys[active.task.provider as ResearchProvider] && <button onClick={() => setSettingsOpen(true)} className="ml-7 text-xs font-medium text-[#a24138] underline underline-offset-4">Add this provider’s API key to continue.</button>}
              </div>
            </div>
            {active && <div className="rounded-2xl border border-[#e0e6df] bg-white p-5"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78936a]">Retrieved sources</p><span className="text-xs text-[#82918b]">{active.sources.length}</span></div><div className="mt-3 divide-y divide-[#e8ede8]">{active.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="block py-3 first:pt-0 last:pb-0 hover:opacity-75"><p className="text-sm font-medium leading-5 text-[#24433b]">{source.title}</p><p className="mt-1 truncate text-xs text-[#83918c]">{source.domain}</p></a>)}</div></div>}
          </div>

          <div className="rounded-2xl border border-[#dfe7df] bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)] sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78936a]">Final report</p><h2 className="mt-1 font-serif text-3xl text-[#19342e]">{reportQuery.data?.title || "A report will take shape here"}</h2></div>{reportQuery.data && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(reportQuery.data.markdown); toast.success("Report copied."); }} className="gap-1.5 border-[#dce4de] text-[#476259]"><Clipboard className="h-3.5 w-3.5" /> Copy</Button><Button variant="outline" size="sm" onClick={async () => { const exported = await exportMarkdownQuery.refetch(); if (exported.data) downloadText(exported.data.filename, exported.data.markdown, exported.data.contentType); }} className="gap-1.5 border-[#dce4de] text-[#476259]"><Download className="h-3.5 w-3.5" /> Markdown</Button><Button size="sm" onClick={() => downloadPdf(reportQuery.data.title, reportQuery.data.markdown)} className="gap-1.5 bg-[#0a2825] text-white hover:bg-[#123c37]"><Download className="h-3.5 w-3.5" /> PDF</Button></div>}</div>
            <div className="mt-7 min-h-96 rounded-xl bg-[#fbfcfa] p-4 sm:p-6"><div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-[#19342e] prose-h2:text-2xl prose-h3:text-lg prose-p:leading-7 prose-p:text-[#456057] prose-a:text-[#507747] prose-a:underline-offset-4">{reportQuery.isLoading ? <div className="flex h-72 items-center justify-center gap-2 text-sm text-[#78936a]"><Loader2 className="h-4 w-4 animate-spin" /> Loading report</div> : reportQuery.data ? <Streamdown>{reportQuery.data.markdown}</Streamdown> : <div className="flex h-72 flex-col items-center justify-center text-center"><Clock3 className="h-6 w-6 text-[#9cad9c]" /><p className="mt-3 max-w-xs text-sm leading-6 text-[#7e8d87]">Once the source trail is complete, your report will appear with executive summary, findings, and sources.</p></div>}</div></div>
          </div>
        </section>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl border-[#dce4de] bg-[#fcfdfb] p-0 shadow-2xl">
          <div className="border-b border-[#e1e7e0] bg-[#f4f7f0] px-6 py-5">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-[#19342e]">Provider configuration</DialogTitle>
              <DialogDescription className="pt-1 text-sm text-[#687972]">Choose the active model and verify its connection before beginning research.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {RESEARCH_PROVIDERS.map(provider => <button key={provider} onClick={() => selectProvider(provider)} className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${config.provider === provider ? "border-[#8ea853] bg-[#eaf2dd] text-[#28443b]" : "border-[#dce4de] bg-white text-[#697a73] hover:bg-[#f5f8f3]"}`}>{providerNames[provider]}</button>)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model" className="text-xs font-semibold text-[#496158]">Model identifier</Label>
              <Input id="model" list="model-hints" value={config.model} onChange={event => setConfig(current => ({ ...current, model: event.target.value }))} className="border-[#cedad0] bg-white" />
              <datalist id="model-hints">{modelList.map(model => <option key={model} value={model} />)}</datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-key" className="text-xs font-semibold text-[#496158]">API key</Label>
              <Input id="provider-key" type="password" autoComplete="off" value={config.apiKey} onChange={event => setConfig(current => ({ ...current, apiKey: event.target.value }))} placeholder={`Enter your ${providerNames[config.provider]} key`} className="border-[#cedad0] bg-white" />
              <p className="text-xs leading-5 text-[#7b8984]">The key is sent only for a connection test or active research step. It is never saved to the database, local storage, reports, or server logs, and is cleared when this page closes.</p>
            </div>
            <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
              <Button variant="outline" onClick={() => setSettingsOpen(false)} className="border-[#d3ddd3]">Cancel</Button>
              <Button variant="outline" onClick={() => verifyProviderMutation.mutate({ provider: config.provider, model: config.model.trim(), apiKey: config.apiKey.trim() }, { onSuccess: result => toast.success(`Connection confirmed: ${result.preview}`), onError: error => toast.error(error.message) })} disabled={verifyProviderMutation.isPending} className="border-[#a8bd9b] text-[#39574a]">{verifyProviderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Test connection</Button>
              <Button onClick={saveConfig} disabled={savePreferenceMutation.isPending} className="bg-[#0a2825] text-white hover:bg-[#123c37]">Save configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

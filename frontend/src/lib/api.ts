import type {
  Lead, Email, LeadActivity, PipelineAnalytics, PipelineReport,
  DashboardData, ForecastData,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const leadsApi = {
  list:       (stage?: string) => req<Lead[]>(`/leads${stage ? `?stage=${stage}` : ""}`),
  get:        (id: number)     => req<Lead>(`/leads/${id}`),
  create:     (body: Partial<Lead>) =>
    req<Lead>("/leads", { method: "POST", body: JSON.stringify(body) }),
  update:     (id: number, body: Partial<Lead>) =>
    req<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove:     (id: number) => req<void>(`/leads/${id}`, { method: "DELETE" }),
  enrich:     (id: number) => req<Lead>(`/leads/${id}/enrich`, { method: "POST" }),
  score:      (id: number) => req<Lead>(`/leads/${id}/score`, { method: "POST" }),
  nextAction: (id: number) => req<Lead>(`/leads/${id}/next-action`, { method: "POST" }),
  email:      (id: number, emailType: string) =>
    req<Email>(`/leads/${id}/email`, { method: "POST", body: JSON.stringify({ email_type: emailType }) }),
  openEmail:  (leadId: number, emailId: number) =>
    req<Email>(`/leads/${leadId}/email/${emailId}/open`, { method: "POST" }),
  activities: (id: number) => req<LeadActivity[]>(`/leads/${id}/activities`),
};

export const analyticsApi = {
  pipeline: () => req<PipelineAnalytics>("/analytics/pipeline"),
  report:   () => req<PipelineReport>("/analytics/report"),
  forecast: () => req<ForecastData>("/analytics/forecast"),
};

export const dashboardApi = {
  get: () => req<DashboardData>("/dashboard"),
};

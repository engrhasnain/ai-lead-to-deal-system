export type LeadStage  = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type ICPFit     = "high" | "medium" | "low";
export type EmailType  = "cold" | "follow_up_1" | "follow_up_2" | "proposal";

export interface Email {
  id:           number;
  lead_id:      number;
  email_type:   EmailType;
  subject:      string;
  body:         string;
  generated_at: string;
  opened_at:    string | null;
}

export interface LeadActivity {
  id:          number;
  lead_id:     number;
  event_type:  string;
  description: string;
  created_at:  string;
}

export interface Lead {
  id:               number;
  name:             string;
  email:            string;
  company:          string;
  title:            string;
  industry:         string;
  source:           string;
  stage:            LeadStage;
  score:            number | null;
  score_reasoning:  string | null;
  deal_value:       number | null;
  currency:         string;
  next_action:      string | null;
  ai_summary:       string | null;
  icp_fit:          ICPFit | null;
  enriched_at:      string | null;
  notes:            string | null;
  lost_reason:      string | null;
  stage_entered_at: string | null;
  days_in_stage:    number;
  is_stuck:         boolean;
  created_at:       string;
  updated_at:       string;
  emails:           Email[];
  activities:       LeadActivity[];
}

export interface PipelineAnalytics {
  total_leads:    number;
  total_value:    number;
  win_rate:       number;
  avg_deal_size:  number;
  by_stage:       Record<string, number>;
  by_stage_value: Record<string, number>;
  by_source:      Record<string, number>;
  by_industry:    Record<string, number>;
  high_icp:       number;
  scored_leads:   number;
}

export interface PipelineReport {
  report:       string;
  generated_at: string;
}

export interface DashboardLeadItem {
  id:            number;
  name:          string;
  company:       string;
  stage:         string;
  score:         number | null;
  deal_value:    number | null;
  days_in_stage: number;
  icp_fit:       string | null;
}

export interface DashboardActivity {
  event_type:  string;
  description: string;
  lead_name:   string;
  time_ago:    string;
}

export interface DashboardData {
  total_leads:         number;
  pipeline_value:      number;
  won_this_month:      number;
  won_this_quarter:    number;
  ai_actions_total:    number;
  deals_closing_week:  DashboardLeadItem[];
  top_leads:           DashboardLeadItem[];
  recent_activities:   DashboardActivity[];
  quota_target:        number;
  quota_achieved:      number;
}

export interface ForecastStage {
  stage:       string;
  value:       number;
  weighted:    number;
  probability: number;
  count:       number;
}

export interface ForecastData {
  weighted_pipeline:      number;
  expected_close_quarter: number;
  probability_by_stage:   ForecastStage[];
  lost_reasons:           Record<string, number>;
}

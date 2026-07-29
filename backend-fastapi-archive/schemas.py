from datetime import datetime
from pydantic import BaseModel, computed_field


class EmailOut(BaseModel):
    id:           int
    lead_id:      int
    email_type:   str
    subject:      str
    body:         str
    generated_at: datetime
    opened_at:    datetime | None = None

    model_config = {"from_attributes": True}


class LeadActivityOut(BaseModel):
    id:          int
    lead_id:     int
    event_type:  str
    description: str
    created_at:  datetime

    model_config = {"from_attributes": True}


class LeadCreate(BaseModel):
    name:       str
    email:      str
    company:    str
    title:      str
    industry:   str
    source:     str = "manual"
    deal_value: float | None = None
    currency:   str = "USD"


class LeadUpdate(BaseModel):
    name:             str | None = None
    email:            str | None = None
    company:          str | None = None
    title:            str | None = None
    industry:         str | None = None
    source:           str | None = None
    stage:            str | None = None
    deal_value:       float | None = None
    currency:         str | None = None
    next_action:      str | None = None
    notes:            str | None = None
    lost_reason:      str | None = None
    stage_entered_at: datetime | None = None


class LeadOut(LeadCreate):
    id:               int
    stage:            str
    score:            int | None
    score_reasoning:  str | None
    next_action:      str | None
    ai_summary:       str | None
    icp_fit:          str | None
    enriched_at:      datetime | None
    notes:            str | None = None
    lost_reason:      str | None = None
    stage_entered_at: datetime | None = None
    created_at:       datetime
    updated_at:       datetime
    emails:           list[EmailOut] = []
    activities:       list[LeadActivityOut] = []

    @computed_field
    @property
    def days_in_stage(self) -> int:
        if not self.stage_entered_at:
            return 0
        return max(0, (datetime.utcnow() - self.stage_entered_at).days)

    @computed_field
    @property
    def is_stuck(self) -> bool:
        return self.days_in_stage > 14 and self.stage not in ("won", "lost")

    model_config = {"from_attributes": True}


class EmailGenRequest(BaseModel):
    email_type: str = "cold"


class PipelineAnalytics(BaseModel):
    total_leads:    int
    total_value:    float
    win_rate:       float
    avg_deal_size:  float
    by_stage:       dict[str, int]
    by_stage_value: dict[str, float]
    by_source:      dict[str, int]
    by_industry:    dict[str, int]
    high_icp:       int
    scored_leads:   int


class DashboardLeadItem(BaseModel):
    id:            int
    name:          str
    company:       str
    stage:         str
    score:         int | None
    deal_value:    float | None
    days_in_stage: int
    icp_fit:       str | None = None


class DashboardActivity(BaseModel):
    event_type:  str
    description: str
    lead_name:   str
    time_ago:    str


class DashboardData(BaseModel):
    total_leads:         int
    pipeline_value:      float
    won_this_month:      float
    won_this_quarter:    float
    ai_actions_total:    int
    deals_closing_week:  list[DashboardLeadItem]
    top_leads:           list[DashboardLeadItem]
    recent_activities:   list[DashboardActivity]
    quota_target:        float
    quota_achieved:      float


class ForecastStage(BaseModel):
    stage:       str
    value:       float
    weighted:    float
    probability: int
    count:       int


class ForecastData(BaseModel):
    weighted_pipeline:      float
    expected_close_quarter: float
    probability_by_stage:   list[ForecastStage]
    lost_reasons:           dict[str, int]

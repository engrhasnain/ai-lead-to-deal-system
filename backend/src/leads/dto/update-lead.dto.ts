import { IsDateString, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

// Mirrors backend-fastapi-archive/schemas.py::LeadUpdate — every field optional.
export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsNumber()
  deal_value?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  next_action?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  lost_reason?: string;

  @IsOptional()
  @IsDateString()
  stage_entered_at?: string;
}

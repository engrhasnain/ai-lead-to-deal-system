import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

// Mirrors backend-fastapi-archive/schemas.py::LeadCreate. Field names are kept
// in snake_case to match exactly what frontend/src/lib/api.ts sends as JSON.
export class CreateLeadDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  company!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  industry!: string;

  @IsOptional()
  @IsString()
  source?: string = 'manual';

  @IsOptional()
  @IsNumber()
  deal_value?: number | null;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

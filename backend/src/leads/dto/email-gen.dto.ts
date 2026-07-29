import { IsOptional, IsString } from 'class-validator';

// Mirrors backend-fastapi-archive/schemas.py::EmailGenRequest
export class EmailGenDto {
  @IsOptional()
  @IsString()
  email_type?: string = 'cold';
}

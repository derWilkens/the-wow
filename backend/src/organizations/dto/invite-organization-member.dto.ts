import { IsEmail, IsIn, IsOptional } from 'class-validator'

export class InviteOrganizationMemberDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member'
}

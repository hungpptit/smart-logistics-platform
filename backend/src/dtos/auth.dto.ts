import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Tên tài khoản phải là một chuỗi ký tự' })
  @MinLength(3, { message: 'Tên tài khoản phải có ít nhất 3 ký tự' })
  @MaxLength(50, { message: 'Tên tài khoản không được vượt quá 50 ký tự' })
  username!: string;

  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là một chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @IsString({ message: 'Số điện thoại phải là một chuỗi ký tự' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Đường dẫn ảnh đại diện phải là một chuỗi ký tự' })
  @IsOptional()
  avatarUrl?: string;

  @IsString({ message: 'Mã vai trò phải là một chuỗi ký tự' })
  @IsOptional()
  roleCode?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là một chuỗi ký tự' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token phải là một chuỗi ký tự' })
  refreshToken!: string;
}

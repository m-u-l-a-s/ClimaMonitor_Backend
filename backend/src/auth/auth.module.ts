// auth.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module'; // Verifique se o caminho está correto

@Module({
  imports: [
    forwardRef(() => UserModule),
    JwtModule.register({
      secret: 'supersecretkey',
      signOptions: { expiresIn: '600s' },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID', 'mock_id');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET', 'mock_secret');
    const callbackURL = configService.get<string>('GITHUB_CALLBACK_URL', 'http://localhost:3001/auth/github/callback');

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email', 'read:org'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: any) {
    try {
      const { id, displayName, username, emails, photos } = profile;
      const email = emails?.[0]?.value || `${username || id}@github.placeholder.com`;
      const avatarUrl = photos?.[0]?.value || '';
      const name = displayName || username || '';

      const user = await this.authService.validateGithubUser({
        githubId: id.toString(),
        email,
        name,
        avatarUrl,
      });

      done(null, user);
    } catch (err) {
      this.logger.error('Error during Github validation', err);
      done(err, null);
    }
  }
}

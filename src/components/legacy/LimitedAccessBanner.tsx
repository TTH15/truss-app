import type { Language, User } from '../../domain/types/app';

interface LimitedAccessBannerProps {
  language: Language;
  user: User;
  onOpenProfile: () => void;
}

export function LimitedAccessBanner({ language, user, onOpenProfile }: LimitedAccessBannerProps) {
  return null;
}

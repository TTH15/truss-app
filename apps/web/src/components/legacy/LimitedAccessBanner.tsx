import type { Language, User } from '@truss/core';

interface LimitedAccessBannerProps {
  language: Language;
  user: User;
  onOpenProfile: () => void;
}

export function LimitedAccessBanner({ language, user, onOpenProfile }: LimitedAccessBannerProps) {
  return null;
}

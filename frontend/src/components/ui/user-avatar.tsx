import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildAssetUrl } from '@/lib/assets';
import { cn } from '@/lib/utils';

export function getInitials(name?: string) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

type UserLike = { name?: string; profilePhotoUrl?: string; companyLogoUrl?: string } | null | undefined;

interface UserAvatarProps {
  user: UserLike;
  className?: string;
  fallbackClassName?: string;
}

/** Shows the participant's uploaded photo; initials only when no usable photo exists. */
export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
  const src = buildAssetUrl(user?.profilePhotoUrl || user?.companyLogoUrl);
  const name = user?.name || 'User';
  return (
    <Avatar className={cn('shrink-0', className)}>
      {src ? <AvatarImage src={src} alt={`${name} profile photo`} /> : null}
      <AvatarFallback className={fallbackClassName} aria-label={name}>{getInitials(user?.name)}</AvatarFallback>
    </Avatar>
  );
}

import { Profile } from "@/types";
import { avatarColor, getInitials, cn } from "@/lib/utils";
import Image from "next/image";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  xs: "w-5 h-5 text-xs",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
};

interface AvatarProps {
  profile: Pick<Profile, "name" | "avatar_url" | "initials" | "color">;
  size?: Size;
  className?: string;
}

export function Avatar({ profile, size = "sm", className }: AvatarProps) {
  const sizeClass = SIZE_MAP[size];
  const color = profile.color || avatarColor(profile.name);
  const initials = profile.initials || getInitials(profile.name);

  if (profile.avatar_url) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0", sizeClass, className)}>
        <Image src={profile.avatar_url} alt={profile.name} width={44} height={44} className="object-cover w-full h-full" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0", color, sizeClass, className)}>
      {initials}
    </div>
  );
}

// Stack of avatars (for team display)
interface AvatarGroupProps {
  profiles: Pick<Profile, "name" | "avatar_url" | "initials" | "color">[];
  size?: Size;
  max?: number;
}

export function AvatarGroup({ profiles, size = "sm", max = 4 }: AvatarGroupProps) {
  const shown = profiles.slice(0, max);
  const rest  = profiles.length - max;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">
          <Avatar profile={p} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div className={cn("ring-2 ring-white rounded-full flex items-center justify-center bg-slate-200 text-slate-600 font-semibold flex-shrink-0", SIZE_MAP[size])}>
          +{rest}
        </div>
      )}
    </div>
  );
}

import { Picture } from "./Picture";
import { PictureChoices } from "./PictureChoices";
import { avatarGroups } from "./set";
import { cn } from "../lib/utils";

export type AvatarPickerProps = {
  name: string;

  legend: string;

  names: Record<string, string>;

  value: string | null;

  onChange: (avatar: string) => void;

  immediate?: boolean;
  error?: string;
  className?: string;
};

// People first, then animals: the gap between the two rows is the only divider.
export function AvatarPicker({ className, ...props }: AvatarPickerProps) {
  return <PictureChoices {...props} className={cn("avatar-picker", className)} groups={avatarGroups} draw={(id) => <Picture of={{ avatar: id, frame: "none" }} size={56} />} />;
}

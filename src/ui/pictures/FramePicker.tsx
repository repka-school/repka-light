import { Picture } from "./Picture";
import { PictureChoices } from "./PictureChoices";
import { frameIds } from "./set";

export type FramePickerProps = {
  name: string;

  legend: string;

  names: Record<string, string>;

  value: string;

  avatar: string | null;

  onChange: (frame: string) => void;
  error?: string;
  className?: string;
};

export function FramePicker({ avatar, ...props }: FramePickerProps) {
  return <PictureChoices {...props} groups={[{ ids: frameIds }]} draw={(id) => <Picture of={{ avatar, frame: id }} size={56} />} />;
}

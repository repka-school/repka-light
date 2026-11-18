import { difficultyOf, taskXp } from "@/store/xp";
import { t } from "@/strings";

/** What a task gives when solved on the first try, coloured by how hard the task is. */
export function XpTag({ points }: { points: number | null }) {
  return (
    <span className="xp-tag" data-difficulty={difficultyOf(points)}>
      {t.xpGain(taskXp(points, "first"))}
    </span>
  );
}

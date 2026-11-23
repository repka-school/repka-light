import { NavLink } from "react-router";
import { t } from "@/strings";

/** The switch above the two lists, courses and programs: each is a page of its own. */
export function ListSwitch() {
  return (
    <nav className="list-switch" aria-label={t.listSwitchLabel}>
      <NavLink to="/courses" id="switch-courses" end>
        {t.switchCourses}
      </NavLink>
      <NavLink to="/programs" id="switch-programs" end>
        {t.switchPrograms}
      </NavLink>
    </nav>
  );
}

import { backupFileName, toBackup } from "@/store/backup";
import { getSaved } from "@/store/store";
import { t } from "@/strings";
import { announce } from "@/ui/components/Announcer";

export function downloadBackup() {
  const text = JSON.stringify(toBackup(getSaved()), null, 2);
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  link.click();
  URL.revokeObjectURL(url);
  announce(t.backupDone);
}

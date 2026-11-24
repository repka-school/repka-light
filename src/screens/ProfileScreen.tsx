import { useRef, useState, type ChangeEvent } from "react";
import { announce } from "@/ui/components/Announcer";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/components/ui/dialog";
import { AvatarPicker } from "@/ui/pictures/AvatarPicker";
import { FramePicker } from "@/ui/pictures/FramePicker";
import { Picture } from "@/ui/pictures/Picture";
import { Eyebrow, Page } from "@/components/Chrome";
import { NAME_MAX } from "@/store/storage";
import { BACKUP_MAX_BYTES, backupFileName, fromBackup, toBackup, type ImportError } from "@/store/backup";
import { getSaved, replaceSaved, resetProgress, saveProfile, useSaved } from "@/store/store";
import type { Saved } from "@/store/storage";
import { avatarNames, frameNames, silhouetteName, t } from "@/strings";

/** Hands the browser a file to save. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const dayOf = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
};

/** The learner's profile: a nickname, a picture and its frame, saved as they change; the backup file; and the reset of saved results. */
export function ProfileScreen() {
  const all = useSaved();
  const { profile, results, drills } = all;
  // The field holds what is typed; the saved nickname is its trimmed form.
  const [name, setName] = useState(profile.name);
  const [confirming, setConfirming] = useState(false);
  const saved = Object.keys(results).length;
  const played = Object.keys(drills ?? {}).length;
  const fileInput = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<{ saved: Saved; exportedAt: string } | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const exportBackup = () => {
    download(backupFileName(), JSON.stringify(toBackup(getSaved()), null, 2));
    announce(t.backupDone);
  };
  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The same file can be picked again after a refusal.
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    const read = file.size > BACKUP_MAX_BYTES ? ({ ok: false, error: "tooLarge" } as const) : fromBackup(await file.text());
    if (read.ok) setIncoming({ saved: read.saved, exportedAt: read.exportedAt });
    else setImportError(read.error);
  };
  const confirmImport = async () => {
    if (!incoming) return;
    const complete = replaceSaved(incoming.saved);
    setName(incoming.saved.profile.name);
    setIncoming(null);
    await complete;
    announce(t.importDone);
  };
  const reset = async () => {
    const complete = resetProgress();
    setConfirming(false);
    await complete;
    announce(t.resetDone);
  };
  return (
    <Page focusKey="profile">
      <section className="settings-page">
        <Eyebrow>{t.profileEyebrow}</Eyebrow>
        <PageHeading>{t.profileTitle}</PageHeading>
        <div className="settings-group">
          <div className="picture-preview">
            <Picture of={profile} size={72} label={profile.avatar ? avatarNames[profile.avatar] : silhouetteName} />
            <span className="picture-preview-name profile-name">{profile.name || t.guest}</span>
          </div>
          <label className="field" htmlFor="nickname">
            {t.nickname}
            <input
              id="nickname"
              type="text"
              autoComplete="off"
              maxLength={NAME_MAX}
              value={name}
              aria-describedby="nickname-hint"
              onChange={(event) => {
                setName(event.target.value);
                saveProfile({ name: event.target.value });
              }}
            />
          </label>
          <p className="field-hint" id="nickname-hint">
            {t.nicknameHint}
          </p>
        </div>
        <div className="picture-fields">
          <AvatarPicker name="avatar" legend={t.pictureLegend} names={avatarNames} value={profile.avatar} immediate onChange={(avatar) => saveProfile({ avatar })} />
          <FramePicker name="frame" legend={t.frameLegend} names={frameNames} value={profile.frame} avatar={profile.avatar} onChange={(frame) => saveProfile({ frame })} />
        </div>
        <div className="settings-group">
          <div className="settings-group-head">
            <h2>{t.progressHeading}</h2>
          </div>
          <div className="settings-list">
            <div className="settings-row">
              <span className="settings-row-text">{played ? t.drill.saved(played) + (saved ? ` ${t.solvedTotal(saved)}` : "") : t.solvedTotal(saved)}</span>
              <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="secondary" id="reset-progress" disabled={saved + played === 0}>
                    {t.resetProgress}
                  </Button>
                </DialogTrigger>
                <DialogContent className="reset-dialog">
                  <DialogHeader>
                    <DialogTitle>{t.resetTitle}</DialogTitle>
                    <DialogDescription>{t.resetText}</DialogDescription>
                  </DialogHeader>
                  <DialogFooter closeLabel={t.resetCancel}>
                    <Button type="button" variant="destructive" id="reset-confirm" onClick={reset}>
                      {t.resetConfirm}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="settings-row">
              <span className="settings-row-text">{t.backupText}</span>
              <span className="settings-row-actions">
                <Button type="button" variant="outline" className="secondary" id="backup-export" onClick={exportBackup}>
                  {t.backupExport}
                </Button>
                <Button type="button" variant="outline" className="secondary" id="backup-import" aria-describedby={importError ? "backup-error" : undefined} onClick={() => fileInput.current?.click()}>
                  {t.backupImport}
                </Button>
              </span>
              <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={pickFile} />
              {importError && (
                <p id="backup-error" className="inline-error settings-row-error" role="alert">
                  {t.importErrors[importError]}
                </p>
              )}
              <Dialog open={incoming !== null} onOpenChange={(open) => !open && setIncoming(null)}>
                <DialogContent className="reset-dialog">
                  <DialogHeader>
                    <DialogTitle>{t.importTitle}</DialogTitle>
                    <DialogDescription>
                      {incoming && t.importText(
                        incoming.saved.profile.name || t.guest,
                        Object.keys(incoming.saved.results).length + Object.keys(incoming.saved.drills ?? {}).length,
                        dayOf(incoming.exportedAt),
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter closeLabel={t.resetCancel}>
                    <Button type="button" variant="destructive" id="import-confirm" onClick={confirmImport}>
                      {t.importConfirm}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
}

import { useRef, useState, type ChangeEvent } from "react";
import { downloadBackup } from "@/ui/lib/downloadBackup";
import { announce } from "@/ui/components/Announcer";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/components/ui/dialog";
import { AvatarPicker } from "@/ui/pictures/AvatarPicker";
import { FramePicker } from "@/ui/pictures/FramePicker";
import { Picture } from "@/ui/pictures/Picture";
import { Eyebrow, Page } from "@/components/Chrome";
import { NAME_MAX } from "@/store/storage";
import { readBackup, type ImportError } from "@/store/backup";
import { replaceSaved, resetProgress, saveProfile, useSaved } from "@/store/store";
import type { Saved } from "@/store/storage";
import { avatarNames, frameNames, silhouetteName, t } from "@/strings";

const dayOf = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
};

/** The learner's profile: a nickname, a picture and its frame, saved as they change; the backup file; and the reset of saved results. */
export default function ProfileScreen() {
  const all = useSaved();
  const { profile, results, drills } = all;
  // The field holds what is typed; the saved nickname is its trimmed form.
  const [name, setName] = useState(profile.name);
  const [confirming, setConfirming] = useState(false);
  const saved = Object.keys(results).length;
  const played = Object.keys(drills ?? {}).length;
  const fileInput = useRef<HTMLInputElement>(null);
  const fileRequest = useRef(0);
  const [incoming, setIncoming] = useState<{ saved: Saved; exportedAt: string } | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState("");
  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The same file can be picked again after a refusal.
    event.target.value = "";
    if (!file) return;
    const request = ++fileRequest.current;
    setImportError(null);
    setWriteError("");
    const read = await readBackup(file);
    if (request !== fileRequest.current) return;
    if (read.ok) setIncoming({ saved: read.saved, exportedAt: read.exportedAt });
    else setImportError(read.error);
  };
  const confirmImport = async () => {
    if (!incoming || saving) return;
    setSaving(true);
    const persisted = await replaceSaved(incoming.saved);
    setSaving(false);
    if (!persisted) {
      setWriteError(t.importFailed);
      return;
    }
    setName(incoming.saved.profile.name);
    setIncoming(null);
    announce(t.importDone);
  };
  const reset = async () => {
    if (saving) return;
    setSaving(true);
    const persisted = await resetProgress();
    setSaving(false);
    if (!persisted) {
      setWriteError(t.resetFailed);
      return;
    }
    setConfirming(false);
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
              <Dialog open={confirming} onOpenChange={(open) => {
                if (saving) return;
                setWriteError("");
                setConfirming(open);
              }}>
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
                  {writeError && <p className="inline-error" role="alert">{writeError}</p>}
                  <DialogFooter closeLabel={saving ? undefined : t.resetCancel}>
                    <Button type="button" variant="destructive" id="reset-confirm" disabled={saving} onClick={reset}>
                      {t.resetConfirm}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="settings-row">
              <span className="settings-row-text">{t.backupText}</span>
              <span className="settings-row-actions">
                <Button type="button" variant="outline" className="secondary" id="backup-export" onClick={downloadBackup}>
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
              <Dialog open={incoming !== null} onOpenChange={(open) => !open && !saving && setIncoming(null)}>
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
                  {writeError && <p className="inline-error" role="alert">{writeError}</p>}
                  <DialogFooter closeLabel={saving ? undefined : t.resetCancel}>
                    <Button type="button" variant="destructive" id="import-confirm" disabled={saving} onClick={confirmImport}>
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

import { useState } from 'react';
import { api } from '../api';
import { formatTime } from '../time';
import type { ConfigVersion, Draft, JsonObject, ValidationIssue, ValidationReport } from '../types';
import { ErrorBanner, Status, useLoad } from '../ui';
import { ValueEditor } from './ConfigEditor';

// Thứ tự ưu tiên khi hiển thị; mục mới Server thêm vào config vẫn hiện ở cuối nên không bị bỏ sót.
const PREFERRED = ['levels', 'rods', 'fish', 'ticketPricing', 'seatSession', 'minigame', 'spawn', 'fishing', 'lengthTiers', 'shopOffers'];
const HIDDEN = ['configVersion', 'status'];

export function sectionsOf(document: JsonObject): string[] {
  const rest = Object.keys(document).filter((key) => !PREFERRED.includes(key) && !HIDDEN.includes(key));
  return [...PREFERRED.filter((key) => key in document), ...rest];
}

/** Lỗi Server trả theo đường dẫn ("fish", "$.seatTiers[2].unitPriceGold"); lấy phần đầu để gắn vào đúng mục. */
export function sectionOf(path: string): string {
  return path.replace(/^\$\.?/, '').split(/[.[]/)[0] ?? '';
}

export function ConfigPage({ canWrite, canPublish }: { canWrite: boolean; canPublish: boolean }) {
  const versions = useLoad(() => api<ConfigVersion[]>('GET', '/api/v1/admin/config/versions'), []);
  const [base, setBase] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [document, setDocument] = useState<JsonObject | null>(null);
  const [dirty, setDirty] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');

  const active = versions.data?.find((version) => version.isActive);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice('');
    try {
      await action();
    } catch (caught) {
      setError(caught);
    }
  };

  const open = (next: Draft) => {
    setDraft(next);
    setDocument(next.document);
    setDirty(false);
    setReport(null);
  };

  const createDraft = () =>
    run(async () => open(await api<Draft>('POST', '/api/v1/admin/config/drafts', { baseVersion: base || active?.version })));

  const save = () =>
    run(async () => {
      open(await api<Draft>('PUT', `/api/v1/admin/config/drafts/${draft!.draftId}`, { expectedRevision: draft!.revision, document }));
      setNotice('Đã lưu nháp.');
    });

  const validate = () =>
    run(async () => setReport(await api<ValidationReport>('POST', `/api/v1/admin/config/drafts/${draft!.draftId}/validate`)));

  const publish = () =>
    run(async () => {
      if (!window.confirm(`Publish nháp thành version mới thay cho ${active?.version}? Phiên ghế và lần câu đang chạy vẫn dùng version cũ.`))
        return;
      const result = await api<{ version: string }>('POST', `/api/v1/admin/config/drafts/${draft!.draftId}/publish`, {
        expectedRevision: draft!.revision,
        expectedActiveVersion: active?.version,
      });
      setDraft(null);
      setDocument(null);
      setNotice(`Đã publish ${result.version}.`);
      await versions.reload();
    });

  const issuesFor = (section: string): ValidationIssue[] => report?.errors.filter((issue) => sectionOf(issue.path) === section) ?? [];
  const sections = document ? sectionsOf(document) : [];
  const otherIssues = report?.errors.filter((issue) => !sections.includes(sectionOf(issue.path))) ?? [];

  return (
    <section>
      <h2>Config gameplay</h2>
      <Status loading={versions.loading} error={versions.error}>
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Trạng thái</th>
              <th>Publish lúc</th>
              <th>Người publish</th>
            </tr>
          </thead>
          <tbody>
            {versions.data?.map((version) => (
              <tr key={version.version}>
                <td>{version.version}</td>
                <td>{version.isActive ? 'Đang dùng' : '—'}</td>
                <td>{formatTime(version.publishedAt)}</td>
                <td>{version.publishedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canWrite && !draft && (
          <div className="row">
            <label>
              Tạo nháp từ
              <select value={base || active?.version || ''} onChange={(event) => setBase(event.target.value)}>
                {versions.data?.map((version) => (
                  <option key={version.version} value={version.version}>
                    {version.version}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => void createDraft()}>Tạo nháp</button>
            <span className="muted">Tạo nháp từ version cũ rồi publish là cách rollback.</span>
          </div>
        )}
      </Status>

      <ErrorBanner error={error} />
      {notice && <p className="notice">{notice}</p>}

      {draft && document && (
        <div className="draft">
          <div className="row sticky">
            <strong>
              Nháp từ {draft.baseVersion}, revision {draft.revision}
            </strong>
            <button onClick={() => void save()} disabled={!dirty}>
              Lưu nháp
            </button>
            <button onClick={() => void validate()} disabled={dirty}>
              Kiểm tra
            </button>
            {canPublish && (
              <button className="primary" onClick={() => void publish()} disabled={dirty || report?.valid !== true}>
                Publish
              </button>
            )}
            {dirty && <span className="muted">Lưu nháp trước khi kiểm tra hoặc publish.</span>}
            {report?.valid && <span className="ok">Config hợp lệ.</span>}
          </div>
          {otherIssues.map((issue, index) => (
            <p key={index} className="error">
              {issue.path}: {issue.message}
            </p>
          ))}
          {sections.map((section) => (
            <fieldset key={section} className={issuesFor(section).length ? 'invalid' : undefined}>
              <legend>{section}</legend>
              {issuesFor(section).map((issue, index) => (
                <p key={index} className="error">
                  {issue.path}: {issue.message}
                </p>
              ))}
              <ValueEditor
                path={section}
                value={document[section] ?? null}
                onChange={(value) => {
                  setDocument({ ...document, [section]: value });
                  setDirty(true);
                  setReport(null);
                }}
              />
            </fieldset>
          ))}
        </div>
      )}
    </section>
  );
}

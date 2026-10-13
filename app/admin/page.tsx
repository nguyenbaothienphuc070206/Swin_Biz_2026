"use client";

import { FormEvent, useState } from "react";
import "./admin.css";
import {
  assignAlertOwner,
  assignCaregiver,
  eligibleCaregivers,
  markAlertCalled,
  recordAlertOutcome,
  recordIncident,
  type AdminState,
  type Caregiver,
} from "@/lib/admin/operations";

const ADMIN_ID = "admin-demo";

const seed: AdminState = {
  caregivers: [
    { id: "mai", name: "Cô Trần Thị Mai", commune: "Xã An Bình", availableSlots: ["sáng", "chiều"], rating: 4.9, activeCases: 3, maxCases: 6, verified: true },
    { id: "lam", name: "Chú Nguyễn Văn Lâm", commune: "Xã An Bình", availableSlots: ["sáng"], rating: 4.8, activeCases: 5, maxCases: 6, verified: true },
    { id: "hoa", name: "Cô Lê Thị Hoa", commune: "Xã Bình An", availableSlots: ["chiều"], rating: 4.7, activeCases: 2, maxCases: 5, verified: true },
  ],
  families: [
    { id: "f1", name: "Bác Nguyễn Thị Lan", commune: "Xã An Bình", preferredSlot: "sáng" },
    { id: "f2", name: "Ông Phạm Văn Bình", commune: "Xã Bình An", preferredSlot: "chiều" },
  ],
  alerts: [
    { id: "a1", label: "Chưa xác nhận lượt thăm · 09:30", familyId: "f1", ownerId: "admin-demo", calledAt: null, outcome: null },
    { id: "a2", label: "Gia đình yêu cầu đổi lịch", familyId: "f2", ownerId: null, calledAt: null, outcome: null },
  ],
  incidents: [
    { id: "incident-seed", title: "Lỡ khung giờ buổi sáng", cause: "Lịch thay đổi chưa được xác nhận lại", lesson: "Gọi xác nhận trước ngày thăm một hôm", createdAt: "2026-10-09T04:15:00.000Z", createdBy: "Điều phối viên" },
  ],
  audit: [
    { id: "audit-seed", actorId: "Điều phối viên", action: "incident.recorded", subjectId: "incident-seed", occurredAt: "2026-10-09T04:15:00.000Z" },
  ],
};

const caregiverDocs: Record<string, { status: string; expires: string; items: string[] }> = {
  mai: { status: "Đã xác minh", expires: "12/2027", items: ["CCCD · đã đối chiếu", "Người tham chiếu · 2/2", "Trao đổi trực tiếp · hoàn tất"] },
  lam: { status: "Sắp hết hạn", expires: "11/2026", items: ["CCCD · đã đối chiếu", "Người tham chiếu · 2/2", "Cần rà soát hồ sơ định kỳ"] },
  hoa: { status: "Đã xác minh", expires: "03/2027", items: ["CCCD · đã đối chiếu", "Người tham chiếu · 2/2", "Trao đổi trực tiếp · hoàn tất"] },
};

function initials(name: string) { return name.replace(/^(Cô|Chú|Bác|Ông)\s+/, "").split(" ").slice(-2).map((part) => part[0]).join(""); }
function displayTime(value: string) { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export default function AdminPage() {
  const [state, setState] = useState(seed);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [incident, setIncident] = useState({ title: "", cause: "", lesson: "" });
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});

  function run(action: (current: AdminState) => { ok: boolean; state?: AdminState; reason?: string }) {
    const result = action(state);
    if (result.ok && result.state) { setState(result.state); setNotice("Đã ghi thao tác vào nhật ký mẫu."); }
    else setNotice(result.reason === "owner_required" ? "Hãy giao người nhận trách nhiệm trước." : "Không thể thực hiện. Kiểm tra lịch, năng lực hoặc hồ sơ xác minh.");
  }

  function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run((current) => recordIncident(current, incident, ADMIN_ID));
    setIncident({ title: "", cause: "", lesson: "" });
  }

  const caregivers = state.caregivers;

  return (
    <main className="ops-shell">
      <aside className="ops-rail" aria-label="Điều hướng điều phối">
        <a className="ops-brand" href="/" aria-label="Nhà Gần, về trang chủ"><span className="ops-brand-mark">nhà</span><span>Nhà Gần<small>ĐIỀU PHỐI</small></span></a>
        <nav className="ops-nav">
          <a className="ops-nav-current" href="#tong-quan"><span>⌂</span> Bàn trực hôm nay</a>
          <a href="#ghep-nguoi"><span>↔</span> Ghép người chăm</a>
          <a href="#ho-so"><span>▤</span> Hồ sơ xác minh</a>
          <a href="#canh-bao"><span>⚑</span> Hàng đợi cảnh báo <b>{state.alerts.filter((alert) => !alert.outcome).length}</b></a>
          <a href="#su-co"><span>＋</span> Sổ sự cố</a>
          <a href="#van-hanh"><span>▥</span> Vận hành</a>
        </nav>
        <div className="ops-rail-bottom"><span className="online-dot" /> Ca trực đang mở<small>Điều phối viên · bản xem thử</small></div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar">
          <div><p className="ops-date">THỨ BẢY · 10 THÁNG 10, 2026</p><h1>Bàn trực điều phối</h1></div>
          <div className="ops-user"><span className="avatar avatar-admin">ĐP</span><span>Điều phối viên<small>Ca sáng · 07:00–15:00</small></span><button aria-label="Mở menu tài khoản">⌄</button></div>
        </header>

        <div className="ops-mobile-nav" aria-label="Điều hướng nhanh">
          <a href="#ghep-nguoi">Ghép ca</a><a href="#canh-bao">Cảnh báo</a><a href="#su-co">Sự cố</a><a href="#van-hanh">Chỉ số</a>
        </div>

        <section className="ops-welcome" id="tong-quan">
          <div><span className="ops-kicker">NHỊP ĐIỀU PHỐI HÔM NAY</span><h2>Chào buổi sáng. Có <em>2 việc cần để mắt.</em></h2><p>Một cảnh báo chưa có người nhận · một hồ sơ sắp đến hạn rà soát.</p></div>
          <div className="today-stamp"><span>THỨ BẢY</span><strong>10</strong><span>THÁNG 10</span></div>
        </section>

        {notice && <div className="ops-notice" role="status"><span aria-hidden="true">✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
        <div className="demo-banner"><strong>BẢN XEM THỬ</strong><span>Dữ liệu đang hiển thị là minh họa; thao tác chưa lưu vào hồ sơ thật. Nhật ký bên dưới chỉ tồn tại trong phiên này.</span></div>

        <section className="ops-section" id="ghep-nguoi" aria-labelledby="match-title">
          <div className="section-title-row"><div><span className="ops-kicker">KẾT NỐI ĐÚNG NGƯỜI, ĐÚNG LỊCH</span><h2 id="match-title">Ghép người chăm</h2></div><span className="section-count">02 gia đình chờ ghép</span></div>
          <div className="family-match-list">
            {state.families.map((family) => {
              const choices = eligibleCaregivers(state, family.id);
              const chosen = selected[family.id] ?? choices[0]?.id ?? "";
              return <article className="family-match-card" key={family.id}>
                <div className="match-family"><span className="avatar avatar-family">{initials(family.name)}</span><div><small>GIA ĐÌNH CẦN GHÉP</small><h3>{family.name}</h3><p>{family.commune} <span>·</span> Buổi {family.preferredSlot}</p></div></div>
                <div className="match-arrow" aria-hidden="true">→</div>
                <div className="match-selection"><label htmlFor={`caregiver-${family.id}`}>Người chăm phù hợp</label><div className="select-person"><select id={`caregiver-${family.id}`} value={chosen} onChange={(event) => setSelected({ ...selected, [family.id]: event.target.value })} disabled={choices.length === 0}><option value="">Chưa có người phù hợp</option>{choices.map((person) => <option value={person.id} key={person.id}>{person.name} · ★ {person.rating.toFixed(1)} · {person.activeCases}/{person.maxCases} ca</option>)}</select><span aria-hidden="true">⌄</span></div><small>{choices.length ? `${choices[0].commune} · còn ${choices[0].maxCases - choices[0].activeCases} chỗ nhận` : "Chưa có người đủ điều kiện"}</small></div>
                <button className="button-match" disabled={!chosen} onClick={() => run((current) => assignCaregiver(current, family.id, chosen, ADMIN_ID))}>Xác nhận ghép <span aria-hidden="true">→</span></button>
              </article>;
            })}
          </div>
          <div className="match-rule"><span>ⓘ</span> Gợi ý dựa trên xã, buổi rảnh, xác minh còn hiệu lực và số ca tối đa. Điều phối viên xác nhận trước khi ghép.</div>
        </section>

        <section className="ops-section" id="ho-so" aria-labelledby="caregiver-title">
          <div className="section-title-row"><div><span className="ops-kicker">NGƯỜI Ở GẦN, HỒ SƠ RÕ RÀNG</span><h2 id="caregiver-title">Hồ sơ người chăm</h2></div><button className="text-action" onClick={() => setNotice("Danh sách đang hiển thị hồ sơ mẫu.")}>Xem danh sách <span>→</span></button></div>
          <div className="caregiver-grid">
            {caregivers.map((person) => <CaregiverCard key={person.id} caregiver={person} docs={caregiverDocs[person.id]} onOpenDocs={() => setNotice("Bản xem thử: tài liệu thật chưa kết nối.")} />)}
          </div>
        </section>

        <section className="ops-section alert-section" id="canh-bao" aria-labelledby="alert-title">
          <div className="section-title-row"><div><span className="ops-kicker">KHÔNG CÓ CẢNH BÁO NÀO BỊ BỎ NGỎ</span><h2 id="alert-title">Hàng đợi cảnh báo</h2></div><span className="urgent-pill">{state.alerts.filter((alert) => !alert.ownerId).length} chưa có người nhận</span></div>
          <div className="alert-list">
            {state.alerts.map((alert) => {
              const family = state.families.find((item) => item.id === alert.familyId);
              const ownerName = alert.ownerId ? (alert.ownerId === ADMIN_ID ? "Điều phối viên" : alert.ownerId) : "Chưa giao người xử lý";
              return <article className="alert-card" key={alert.id}>
                <div className="alert-mark" aria-hidden="true">!</div>
                <div className="alert-summary"><span className="alert-family">{family?.name ?? "Gia đình"}</span><h3>{alert.label}</h3><p>Phụ trách: <strong>{ownerName}</strong>{alert.calledAt && <span> · Đã gọi {displayTime(alert.calledAt)}</span>}</p>{alert.outcome && <div className="alert-outcome">Kết quả: {alert.outcome}</div>}</div>
                <div className="alert-actions"><label className="visually-hidden" htmlFor={`owner-${alert.id}`}>Giao người chịu trách nhiệm cho {alert.label}</label><select id={`owner-${alert.id}`} value={alert.ownerId ?? ""} onChange={(event) => run((current) => assignAlertOwner(current, alert.id, event.target.value, ADMIN_ID))}><option value="">Giao người xử lý…</option><option value={ADMIN_ID}>Điều phối viên</option><option value="admin-2">Ca trưởng</option></select><div className="alert-button-row"><button className="button-secondary" disabled={!alert.ownerId} onClick={() => run((current) => markAlertCalled(current, alert.id, ADMIN_ID))}>{alert.calledAt ? "Gọi lại" : "Đã gọi"}</button><button className="button-secondary" onClick={() => { const outcome = outcomes[alert.id]?.trim(); if (!outcome) { setNotice("Nhập kết quả trao đổi trước khi lưu."); return; } run((current) => recordAlertOutcome(current, alert.id, outcome, ADMIN_ID)); }}>Lưu kết quả</button></div><label className="visually-hidden" htmlFor={`outcome-${alert.id}`}>Kết quả xử lý cảnh báo</label><input id={`outcome-${alert.id}`} value={outcomes[alert.id] ?? ""} onChange={(event) => setOutcomes({ ...outcomes, [alert.id]: event.target.value })} placeholder="Kết quả trao đổi…" /></div>
              </article>;
            })}
          </div>
          <p className="scope-note">Cảnh báo chỉ điều phối liên hệ theo quy trình đã duyệt; không thay cho đánh giá hay tư vấn y tế.</p>
        </section>

        <section className="ops-section incident-section" id="su-co" aria-labelledby="incident-title">
          <div className="section-title-row"><div><span className="ops-kicker">GHI NHẬN ĐỂ LẦN SAU TỐT HƠN</span><h2 id="incident-title">Sổ sự cố & bài học</h2></div><span className="section-count">{state.incidents.length} ghi nhận</span></div>
          <div className="incident-layout"><div className="incident-list">{state.incidents.map((item) => <article className="incident-entry" key={item.id}><div className="incident-date">{displayTime(item.createdAt)}</div><div><h3>{item.title}</h3><p><strong>Nguyên nhân:</strong> {item.cause}</p><p className="lesson"><strong>Bài học:</strong> {item.lesson}</p></div></article>)}</div>
            <form className="incident-form" onSubmit={submitIncident}><div><span className="ops-kicker">GHI SỔ MỚI</span><p>Không ghi chẩn đoán hay chi tiết sức khỏe không cần thiết.</p></div><label>Việc đã xảy ra<input required maxLength={120} value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} /></label><label>Nguyên nhân đã xác định<textarea required maxLength={500} rows={2} value={incident.cause} onChange={(e) => setIncident({ ...incident, cause: e.target.value })} /></label><label>Bài học / việc sẽ làm<textarea required maxLength={500} rows={2} value={incident.lesson} onChange={(e) => setIncident({ ...incident, lesson: e.target.value })} /></label><button className="button-match" type="submit">Ghi vào sổ <span>→</span></button></form>
          </div>
        </section>

        <section className="ops-section metrics-section" id="van-hanh" aria-labelledby="metrics-title">
          <div className="section-title-row"><div><span className="ops-kicker">NHÌN NHỊP DỊCH VỤ, KHÔNG CHỈ NHÌN CON SỐ</span><h2 id="metrics-title">Chỉ số vận hành</h2></div><button className="period-select" onClick={() => setNotice("Khoảng thời gian: 30 ngày gần nhất (dữ liệu minh họa).")}>30 ngày qua <span>⌄</span></button></div>
          <div className="metric-grid">
            <Metric title="Chi phí thật / lượt thăm" value="186.000đ" detail="Gồm công, di chuyển, điều phối" trend="−4,2%" />
            <Metric title="Lượt thăm đúng hẹn" value="94,6%" detail="177 / 187 lượt đã lên lịch" trend="+2,1 điểm" />
            <Metric title="Gia hạn gói" value="82%" detail="41 / 50 gia đình đến kỳ" trend="+5 điểm" />
            <Metric title="NPS gia đình" value="68" detail="32 phản hồi trong tháng" trend="+7 điểm" />
          </div>
          <p className="metric-footnote">Số liệu minh họa để trình bày cấu trúc. Chỉ số thật cần định nghĩa mẫu số, kỳ đo và nguồn dữ liệu trước khi công bố.</p>
        </section>

        <section className="ops-section audit-section" aria-labelledby="audit-title"><div className="section-title-row"><div><span className="ops-kicker">RÕ AI ĐÃ LÀM GÌ</span><h2 id="audit-title">Nhật ký thao tác</h2></div><span className="section-count">Trong phiên xem thử</span></div><div className="audit-list">{[...state.audit].reverse().map((entry) => <div className="audit-row" key={entry.id}><span className="audit-icon">↳</span><strong>{entry.actorId}</strong><span>{entry.action}</span><code>{entry.subjectId}</code><time>{displayTime(entry.occurredAt)}</time></div>)}</div><p className="metric-footnote">Bản thật cần ghi audit phía server cùng transaction với thao tác, gắn user đã xác thực và lưu bền vững. Nhật ký trình duyệt không thay thế kiểm toán.</p></section>

        <footer className="ops-footer"><span>NHÀ GẦN <b>·</b> BÀN ĐIỀU PHỐI</span><span>Chỉ điều phối chăm nom đời sống thường ngày</span></footer>
      </div>
    </main>
  );
}

function CaregiverCard({ caregiver, docs, onOpenDocs }: { caregiver: Caregiver; docs: { status: string; expires: string; items: string[] }; onOpenDocs?: () => void }) {
  const soon = docs.status === "Sắp hết hạn";
  return <article className="caregiver-card"><div className="caregiver-card-top"><span className="avatar avatar-caregiver">{initials(caregiver.name)}</span><span className={`verification-badge ${soon ? "badge-soon" : ""}`}><span aria-hidden="true">{soon ? "◷" : "✓"}</span>{docs.status}</span></div><h3>{caregiver.name}</h3><p className="caregiver-location">{caregiver.commune} · {caregiver.availableSlots.join(", ")}</p><div className="caregiver-rating"><strong>★ {caregiver.rating.toFixed(1)}</strong><span>·</span>{caregiver.activeCases}/{caregiver.maxCases} ca đang giữ</div><div className="doc-list">{docs.items.map((item) => <div key={item}><span aria-hidden="true">{item.startsWith("Cần") ? "!" : "✓"}</span>{item}</div>)}</div><div className={`expiry-row ${soon ? "expiry-soon" : ""}`}><span>Rà soát tiếp theo</span><strong>{docs.expires}</strong></div><button className="card-link" onClick={() => onOpenDocs ? onOpenDocs() : undefined}>Mở hồ sơ <span>→</span></button></article>;
}

function Metric({ title, value, detail, trend }: { title: string; value: string; detail: string; trend: string }) {
  return <article className="metric-card"><span className="metric-label">{title}</span><strong>{value}</strong><span className="metric-detail">{detail}</span><span className="metric-trend">↗ {trend} <small>so với kỳ trước</small></span></article>;
}

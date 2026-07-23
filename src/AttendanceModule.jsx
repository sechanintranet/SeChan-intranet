import React, { useEffect, useMemo, useState } from 'react';
import { FEATURE_DEFINITIONS } from './featureAccess.js';

async function invokeAttendance(supabase, body) {
  const { data, error } = await supabase.functions.invoke('attendance-api', { body });
  if (!error) return data;
  let message = error.message || '요청을 처리하지 못했습니다.';
  try {
    const detail = await error.context?.json?.();
    if (detail?.error) message = detail.error;
  } catch {}
  throw new Error(message);
}

function LoadingState() {
  return <div className="attendanceState"><span className="attendanceSpinner" /> 로딩 중</div>;
}

function EmptyState({ children }) {
  return <div className="attendanceState empty">{children}</div>;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export default function AttendanceModule({ supabase, user, superAdmin = false }) {
  const [view, setView] = useState('attendance');
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestForm, setRequestForm] = useState({ work_date: '', destination_store_id: '', reason: '' });

  const canApprove = user.role === '점장' || superAdmin;

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const current = await invokeAttendance(supabase, { action: 'current-status' });
      setStatus(current);
      setRequestForm(previous => ({ ...previous, work_date: previous.work_date || current.today }));
      if (canApprove) {
        const approval = await invokeAttendance(supabase, { action: 'manager-pending' });
        setPending(approval.requests || []);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function checkIn() {
    if (!confirm('현재 매장에서 출근 처리할까요?')) return;
    setBusy(true);
    setMessage('');
    try {
      const location = await getLocation();
      await invokeAttendance(supabase, { action: 'check-in', ...location });
      setMessage('출근 처리가 완료되었습니다.');
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally { setBusy(false); }
  }

  async function submitOtherStore(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'request-other-store', ...requestForm });
      setRequestForm(previous => ({ ...previous, destination_store_id: '', reason: '' }));
      setMessage('타 매장 출근 요청을 보냈습니다.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function requestAction(action, requestId, decision = '') {
    setBusy(true);
    setMessage('');
    try {
      await invokeAttendance(supabase, { action, request_id: requestId, decision });
      setMessage(decision === 'approved' ? '승인했습니다.' : decision === 'rejected' ? '반려했습니다.' : '요청을 취소했습니다.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function retrySheetSync(recordId) {
    setBusy(true);
    setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'retry-sheet-sync', record_id: recordId });
      setMessage('근무표에 다시 반영했습니다.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="attendancePage"><h2>근무</h2><LoadingState /></section>;
  if (!status?.enabled && !superAdmin) {
    return <section className="attendancePage"><h2>근무</h2><EmptyState>근무 기능 사용 권한이 없습니다.</EmptyState></section>;
  }

  return (
    <section className="attendancePage">
      <div className="attendanceTitleRow">
        <div><p className="attendanceEyebrow">세찬컴퍼니</p><h2>근무</h2></div>
        <button type="button" className="attendanceRefresh" onClick={load}>새로고침</button>
      </div>

      {superAdmin && <div className="attendanceTopTabs">
        <button className={view === 'attendance' ? 'active' : ''} onClick={() => setView('attendance')}>출근 현황</button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>매장 출근 설정</button>
      </div>}

      {message && <div className="attendanceMessage" role="status">{message}</div>}

      {view === 'attendance' && <>
        <div className="attendanceSummaryGrid">
          <article><span>오늘 날짜</span><strong>{status?.today || '-'}</strong></article>
          <article><span>근무표</span><strong>{status?.schedule?.value || (status?.scheduleError ? '확인 필요' : '근무')}</strong></article>
          <article><span>출근 상태</span><strong>{status?.record ? '출근 완료' : '미출근'}</strong></article>
        </div>

        <div className="attendancePanel attendanceCheckinPanel">
          <div>
            <h3>오늘 출근</h3>
            {status?.record
              ? <p>{formatDateTime(status.record.checked_in_at)} · {status.record.checkin_store_name} · {status.record.verification_method === 'wifi' ? '매장 WiFi' : '매장 위치'}</p>
              : <p>{status?.scheduleError || '매장 WiFi 또는 위치가 확인되면 출근할 수 있습니다.'}</p>}
          </div>
          <button type="button" className="attendancePrimary" disabled={busy || Boolean(status?.record) || Boolean(status?.schedule?.dayOff) || Boolean(status?.scheduleError)} onClick={checkIn}>
            {status?.record ? '출근 완료' : '출근하기'}
          </button>
        </div>

        <div className="attendanceTwoColumn">
          <div className="attendancePanel">
            <h3>타 매장 출근 요청</h3>
            <p className="attendanceHelp">소속 매장 출근은 그대로 가능하며, 승인된 타 매장은 해당 날짜에 한 번 사용할 수 있습니다. 당일 요청은 낮 12시 전까지만 가능합니다.</p>
            <form className="attendanceForm" onSubmit={submitOtherStore}>
              <label>출근 날짜<input type="date" value={requestForm.work_date} min={status?.today} onChange={event => setRequestForm({ ...requestForm, work_date: event.target.value })} required /></label>
              <label>출근 매장<select value={requestForm.destination_store_id} onChange={event => setRequestForm({ ...requestForm, destination_store_id: event.target.value })} required><option value="">선택</option>{(status?.stores || []).filter(store => store.name !== user.store_name).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
              <label className="full">사유<textarea value={requestForm.reason} onChange={event => setRequestForm({ ...requestForm, reason: event.target.value })} placeholder="타 매장에서 출근해야 하는 이유를 입력해주세요." required /></label>
              <button type="submit" className="attendanceSecondary" disabled={busy}>승인 요청</button>
            </form>
            <div className="attendanceCards">
              {(status?.requests || []).length ? status.requests.map(request => <article key={request.id}>
                <div><strong>{request.work_date} · {request.destination_store_name}</strong><span>{request.reason}</span></div>
                <div className="attendanceCardRight"><em className={`attendanceBadge ${request.status}`}>{request.status === 'pending' ? '승인 대기' : request.status === 'approved' ? '승인 완료' : request.status === 'rejected' ? '반려' : request.status === 'used' ? '사용 완료' : '취소'}</em>{['pending', 'approved'].includes(request.status) && <button type="button" disabled={busy} onClick={() => requestAction('cancel-request', request.id)}>취소</button>}</div>
              </article>) : <EmptyState>진행 중인 타 매장 출근 요청이 없습니다.</EmptyState>}
            </div>
          </div>

          <div className="attendancePanel">
            <h3>내 출근 이력</h3>
            <div className="attendanceDesktopTable"><table><thead><tr><th>날짜</th><th>출근시간</th><th>매장</th><th>확인</th><th>근무표</th></tr></thead><tbody>{(status?.history || []).map(record => <tr key={record.id}><td>{record.work_date}</td><td>{formatDateTime(record.checked_in_at).split(' ').slice(-2).join(' ')}</td><td>{record.checkin_store_name}</td><td>{record.verification_method === 'wifi' ? 'WiFi' : '위치'}</td><td>{record.sheet_sync_status === 'synced' ? '반영 완료' : <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>다시 반영</button>}</td></tr>)}</tbody></table></div>
            <div className="attendanceMobileList">{(status?.history || []).map(record => <article key={record.id}><div><strong>{record.work_date}</strong><span>{record.checkin_store_name} · {record.verification_method === 'wifi' ? 'WiFi' : '위치'}</span></div><div><strong>{formatDateTime(record.checked_in_at).split(' ').slice(-2).join(' ')}</strong>{record.sheet_sync_status === 'synced' ? <span>근무표 반영</span> : <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>다시 반영</button>}</div></article>)}</div>
            {!(status?.history || []).length && <EmptyState>출근 이력이 없습니다.</EmptyState>}
          </div>
        </div>

        {canApprove && <div className="attendancePanel">
          <h3>타 매장 출근 승인</h3>
          <div className="attendanceCards approval">{pending.length ? pending.map(request => <article key={request.id}>
            <div><strong>{request.employee_name} · {request.work_date}</strong><span>{request.home_store_name} → {request.destination_store_name}</span><span>{request.reason}</span></div>
            <div className="attendanceApprovalButtons"><button disabled={busy} onClick={() => requestAction('decide-request', request.id, 'rejected')}>반려</button><button className="attendancePrimary" disabled={busy} onClick={() => requestAction('decide-request', request.id, 'approved')}>승인</button></div>
          </article>) : <EmptyState>승인 대기 중인 요청이 없습니다.</EmptyState>}</div>
        </div>}
      </>}

      {view === 'settings' && superAdmin && <StoreAttendanceSettings supabase={supabase} />}
    </section>
  );
}

export function FeatureAccessManager({ supabase }) {
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('employee');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try { setData(await invokeAttendance(supabase, { action: 'admin-data' })); }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);
  const targets = scope === 'employee' ? (data?.employees || []) : (data?.stores || []);
  useEffect(() => { if (!targets.some(item => item.id === target)) setTarget(targets[0]?.id || ''); }, [scope, data]);

  function modeFor(featureKey) {
    const row = (data?.overrides || []).find(item => item.scope_type === scope && item.feature_key === featureKey && item[scope === 'employee' ? 'employee_id' : 'store_id'] === target);
    return row ? (row.enabled ? 'enabled' : 'disabled') : 'inherit';
  }

  async function save(featureKey, mode) {
    setBusy(true); setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'save-feature-override', scope_type: scope, target_id: target, feature_key: featureKey, mode });
      setMessage('기능 사용 권한을 저장했습니다.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!data) return <LoadingState />;
  return <section className="attendancePage">
    <div className="attendanceTitleRow">
      <div><p className="attendanceEyebrow">최고관리자 전용</p><h2>기능 사용 권한</h2></div>
    </div>
    <div className="attendancePanel">
    <h3>직원별·매장별 기능 설정</h3>
    <p className="attendanceHelp">직원별 설정이 매장별 설정보다 우선합니다. 기존 역할 권한을 높이지 않고, 선택한 기능의 사용 여부만 제한합니다.</p>
    {message && <div className="attendanceMessage">{message}</div>}
    <div className="accessScopeTabs"><button className={scope === 'employee' ? 'active' : ''} onClick={() => setScope('employee')}>직원별</button><button className={scope === 'store' ? 'active' : ''} onClick={() => setScope('store')}>매장별</button></div>
    <label className="accessTarget">{scope === 'employee' ? '직원 선택' : '매장 선택'}<select value={target} onChange={event => setTarget(event.target.value)}>{targets.map(item => <option key={item.id} value={item.id}>{scope === 'employee' ? `${item.store_name} · ${item.name} · ${item.role}` : item.name}</option>)}</select></label>
    <div className="featureAccessGrid">{FEATURE_DEFINITIONS.map(feature => <article key={feature.key}><div><strong>{feature.label}</strong><span>시스템 기본: {feature.defaultEnabled ? '사용' : '미사용'}</span></div><select value={modeFor(feature.key)} disabled={busy || !target} onChange={event => save(feature.key, event.target.value)}><option value="inherit">상위 설정 따름</option><option value="enabled">사용</option><option value="disabled">미사용</option></select></article>)}</div>
    </div>
  </section>;
}

function StoreAttendanceSettings({ supabase }) {
  const [data, setData] = useState(null);
  const [storeId, setStoreId] = useState('');
  const [form, setForm] = useState({ enabled: false, auth_mode: 'either', latitude: '', longitude: '', radius_meters: 100, default_start_time: '', ips: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try { setData(await invokeAttendance(supabase, { action: 'admin-data' })); }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!data) return;
    const nextId = storeId || data.stores?.[0]?.id || '';
    setStoreId(nextId);
    const setting = (data.settings || []).find(item => item.store_id === nextId) || {};
    const ips = (data.ips || []).filter(item => item.store_id === nextId).map(item => item.ip_address).join('\n');
    setForm({ enabled: Boolean(setting.enabled), auth_mode: setting.auth_mode || 'either', latitude: setting.latitude ?? '', longitude: setting.longitude ?? '', radius_meters: setting.radius_meters || 100, default_start_time: setting.default_start_time || '', ips });
  }, [data, storeId]);

  async function useCurrentLocation() {
    const location = await getLocation();
    if (location.latitude == null) return setMessage('현재 위치를 확인할 수 없습니다. 브라우저 위치 권한을 허용해주세요.');
    setForm(previous => ({ ...previous, latitude: location.latitude.toFixed(7), longitude: location.longitude.toFixed(7) }));
    setMessage('현재 위치를 입력했습니다. 저장 버튼을 눌러주세요.');
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'save-store-setting', store_id: storeId, ...form, ips: form.ips.split(/[,\n]/).map(value => value.trim()).filter(Boolean) });
      setMessage('매장 출근 설정을 저장했습니다.'); await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!data) return <LoadingState />;
  return <div className="attendancePanel">
    <h3>매장 출근 설정</h3>
    <p className="attendanceHelp">WiFi 또는 GPS 중 하나가 확인되면 출근할 수 있도록 설정하는 방식을 권장합니다.</p>
    {message && <div className="attendanceMessage">{message}</div>}
    <form className="storeAttendanceForm" onSubmit={save}>
      <label>매장<select value={storeId} onChange={event => setStoreId(event.target.value)}>{(data.stores || []).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
      <label className="toggleLabel"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} /> 출근 기능 활성화</label>
      <label>확인 방식<select value={form.auth_mode} onChange={event => setForm({ ...form, auth_mode: event.target.value })}><option value="either">WiFi 또는 GPS</option><option value="wifi">WiFi만</option><option value="gps">GPS만</option></select></label>
      <label>기본 출근시간<input type="time" value={form.default_start_time} onChange={event => setForm({ ...form, default_start_time: event.target.value })} /></label>
      <label>위도<input type="number" step="0.0000001" value={form.latitude} onChange={event => setForm({ ...form, latitude: event.target.value })} /></label>
      <label>경도<input type="number" step="0.0000001" value={form.longitude} onChange={event => setForm({ ...form, longitude: event.target.value })} /></label>
      <label>허용 반경(m)<input type="number" min="30" max="1000" value={form.radius_meters} onChange={event => setForm({ ...form, radius_meters: event.target.value })} /></label>
      <button type="button" className="attendanceSecondary" onClick={useCurrentLocation}>현재 위치 입력</button>
      <label className="full">매장 WiFi 공인 IP<textarea value={form.ips} onChange={event => setForm({ ...form, ips: event.target.value })} placeholder="IP가 여러 개면 줄을 바꿔 입력해주세요." /></label>
      {data.current_ip && <button type="button" className="attendanceSecondary full" onClick={() => setForm({ ...form, ips: [...new Set([...form.ips.split(/[,\n]/).map(value => value.trim()).filter(Boolean), data.current_ip])].join('\n') })}>현재 접속 IP 추가: {data.current_ip}</button>}
      <button type="submit" className="attendancePrimary full" disabled={busy}>매장 설정 저장</button>
    </form>
  </div>;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FEATURE_DEFINITIONS } from './featureAccess.js';

async function invokeAttendance(supabase, body) {
  const { data, error } = await supabase.functions.invoke('attendance-api', { body });
  if (!error) return data;
  let message = error.message || '?붿껌??泥섎━?섏? 紐삵뻽?듬땲??';
  try {
    const detail = await error.context?.json?.();
    if (detail?.error) message = detail.error;
  } catch {}
  throw new Error(message);
}

function LoadingState() {
  return <div className="attendanceState"><span className="attendanceSpinner" /> 濡쒕뵫 以?/div>;
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

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(value));
}

function sheetSyncLabel(status) {
  if (status === 'synced') return '諛섏쁺 ?꾨즺';
  if (status === 'failed') return '諛섏쁺 ?ㅽ뙣';
  if (status === 'not_configured') return '?곌껐 ?뺤씤 ?꾩슂';
  return '諛섏쁺 以?;
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

const KAKAO_MAP_APP_KEY = String(import.meta.env.VITE_KAKAO_MAP_APP_KEY || '').trim();
let kakaoMapsPromise;

function loadKakaoMaps() {
  if (!KAKAO_MAP_APP_KEY) return Promise.reject(new Error('吏???곌껐 ?ㅺ? ?꾩슂?⑸땲??'));
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao);
  if (kakaoMapsPromise) return kakaoMapsPromise;
  kakaoMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-sechan-kakao-map]');
    const ready = () => window.kakao?.maps?.load(() => resolve(window.kakao));
    if (existing) {
      existing.addEventListener('load', ready, { once: true });
      existing.addEventListener('error', () => reject(new Error('吏?꾨? 遺덈윭?ㅼ? 紐삵뻽?듬땲??')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.sechanKakaoMap = 'true';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_APP_KEY)}&autoload=false&libraries=services`;
    script.onload = ready;
    script.onerror = () => reject(new Error('吏?꾨? 遺덈윭?ㅼ? 紐삵뻽?듬땲??'));
    document.head.appendChild(script);
  });
  return kakaoMapsPromise;
}

function AttendanceLocationPicker({ value, onChange, onMessage }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const [addressInput, setAddressInput] = useState(value.address || '');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { setAddressInput(value.address || ''); }, [value.address]);

  useEffect(() => {
    if (!KAKAO_MAP_APP_KEY || !mapContainerRef.current) return;
    let active = true;
    loadKakaoMaps().then(kakao => {
      if (!active || !mapContainerRef.current) return;
      const latitude = Number(value.latitude) || 37.566826;
      const longitude = Number(value.longitude) || 126.9786567;
      const center = new kakao.maps.LatLng(latitude, longitude);
      const map = new kakao.maps.Map(mapContainerRef.current, { center, level: Number(value.latitude) ? 3 : 8 });
      const marker = new kakao.maps.Marker({ map, position: center });
      const geocoder = new kakao.maps.services.Geocoder();
      kakao.maps.event.addListener(map, 'click', mouseEvent => {
        const position = mouseEvent.latLng;
        marker.setPosition(position);
        geocoder.coord2Address(position.getLng(), position.getLat(), result => {
          const address = result?.[0]?.road_address?.address_name || result?.[0]?.address?.address_name || '';
          onChange({
            latitude: position.getLat().toFixed(7),
            longitude: position.getLng().toFixed(7),
            address
          });
        });
      });
      mapRef.current = map;
      markerRef.current = marker;
      geocoderRef.current = geocoder;
      setMapReady(true);
    }).catch(error => onMessage(error.message));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerRef.current || !window.kakao?.maps) return;
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const position = new window.kakao.maps.LatLng(latitude, longitude);
    markerRef.current.setPosition(position);
    mapRef.current.setCenter(position);
  }, [mapReady, value.latitude, value.longitude]);

  function findAddress() {
    const address = addressInput.trim();
    if (!address) return onMessage('寃?됲븷 二쇱냼瑜??낅젰?댁＜?몄슂.');
    if (!geocoderRef.current) return onMessage('吏???곌껐 ?ㅻ? ?ㅼ젙????二쇱냼 寃?됱쓣 ?ъ슜?????덉뒿?덈떎.');
    geocoderRef.current.addressSearch(address, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result?.[0]) return onMessage('二쇱냼瑜?李얠? 紐삵뻽?듬땲?? ?꾨줈紐?二쇱냼濡??ㅼ떆 寃?됲빐二쇱꽭??');
      const latitude = Number(result[0].y).toFixed(7);
      const longitude = Number(result[0].x).toFixed(7);
      onChange({ latitude, longitude, address: result[0].road_address?.address_name || result[0].address_name || address });
      onMessage('二쇱냼 ?꾩튂瑜?李얠븯?듬땲?? 吏?꾩? ?덉슜 諛섍꼍???뺤씤??????ν빐二쇱꽭??');
    });
  }

  async function useCurrentLocation() {
    const location = await getLocation();
    if (location.latitude == null) return onMessage('?꾩옱 ?꾩튂瑜??뺤씤?????놁뒿?덈떎. 釉뚮씪?곗? ?꾩튂 沅뚰븳???덉슜?댁＜?몄슂.');
    const latitude = location.latitude.toFixed(7);
    const longitude = location.longitude.toFixed(7);
    if (geocoderRef.current) {
      geocoderRef.current.coord2Address(Number(longitude), Number(latitude), result => {
        const address = result?.[0]?.road_address?.address_name || result?.[0]?.address?.address_name || '';
        onChange({ latitude, longitude, address });
      });
    } else {
      onChange({ latitude, longitude });
    }
    onMessage('?꾩옱 ?꾩튂瑜??낅젰?덉뒿?덈떎. ?꾩튂? ?덉슜 諛섍꼍???뺤씤??????ν빐二쇱꽭??');
  }

  return <div className="attendanceLocationPicker full">
    <div className="attendanceAddressRow">
      <label>留ㅼ옣 二쇱냼<input value={addressInput} onChange={event => setAddressInput(event.target.value)} placeholder="?? 寃쎄린???뚯＜??湲덉큿??以묒븰濡?00" /></label>
      <button type="button" className="attendanceSecondary" onClick={findAddress}>二쇱냼 李얘린</button>
      <button type="button" className="attendanceSecondary" onClick={useCurrentLocation}>?꾩옱 ?꾩튂濡?吏??/button>
    </div>
    {KAKAO_MAP_APP_KEY
      ? <><div ref={mapContainerRef} className="attendanceMap" aria-label="異쒓렐 ?꾩튂 吏?? /><p className="attendanceMapHelp">吏?꾨? ?뚮윭 ?뺥솗??異쒓렐 ?꾩튂瑜?吏?뺥븷 ???덉뒿?덈떎.</p></>
      : <div className="attendanceMapUnavailable">吏???곌껐 ?ㅻ? ?깅줉?섎㈃ 二쇱냼 寃?됯낵 吏???좏깮???쒖꽦?붾맗?덈떎. ?꾩옱 ?꾩튂 吏?뺤? 吏湲덈룄 ?ъ슜?????덉뒿?덈떎.</div>}
    <details className="attendanceCoordinateDetails">
      <summary>醫뚰몴 吏곸젒 ?뺤씤쨌?섏젙</summary>
      <div>
        <label>?꾨룄<input type="number" step="0.0000001" value={value.latitude} onChange={event => onChange({ latitude: event.target.value })} /></label>
        <label>寃쎈룄<input type="number" step="0.0000001" value={value.longitude} onChange={event => onChange({ longitude: event.target.value })} /></label>
      </div>
    </details>
  </div>;
}

export default function AttendanceModule({ supabase, user, superAdmin = false }) {
  const [view, setView] = useState('attendance');
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({ records: [], summary: { total: 0, synced: 0, pending: 0, failed: 0 } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestForm, setRequestForm] = useState({ work_date: '', destination_store_id: '', reason: '' });

  const canApprove = user.role === '?먯옣' || superAdmin;
  const canViewTodayAttendance = user.role === '愿由ъ옄' || superAdmin;
  const tabs = [
    { key: 'attendance', label: '異쒓렐 ?꾪솴', show: true },
    { key: 'records', label: '異쒓렐 ?댁뿭', show: canViewTodayAttendance },
    { key: 'approvals', label: '? 留ㅼ옣 異쒓렐 ?뱀씤', show: canApprove },
    { key: 'settings', label: '留ㅼ옣 異쒓렐 ?ㅼ젙', show: superAdmin }
  ].filter(tab => tab.show);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const [currentResult, approvalResult, attendanceResult] = await Promise.allSettled([
        invokeAttendance(supabase, { action: 'current-status' }),
        canApprove ? invokeAttendance(supabase, { action: 'manager-pending' }) : Promise.resolve({ requests: [] }),
        canViewTodayAttendance ? invokeAttendance(supabase, { action: 'today-attendance' }) : Promise.resolve(null)
      ]);
      if (currentResult.status === 'rejected') throw currentResult.reason;
      const current = currentResult.value;
      setStatus(current);
      setRequestForm(previous => ({ ...previous, work_date: previous.work_date || current.today }));
      if (approvalResult.status === 'fulfilled') setPending(approvalResult.value.requests || []);
      if (attendanceResult.status === 'fulfilled' && attendanceResult.value) setTodayAttendance(attendanceResult.value);
      if (approvalResult.status === 'rejected' || attendanceResult.status === 'rejected') {
        setMessage('?쇰? 愿由??먮즺瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function checkIn() {
    if (!confirm('?꾩옱 留ㅼ옣?먯꽌 異쒓렐 泥섎━?좉퉴??')) return;
    setBusy(true);
    setMessage('');
    try {
      try {
        await invokeAttendance(supabase, { action: 'check-in' });
      } catch (wifiError) {
        if (!String(wifiError.message || '').includes('WiFi ?먮뒗 ?꾩튂')) throw wifiError;
        const location = await getLocation();
        if (location.latitude == null) throw new Error('留ㅼ옣 WiFi媛 ?뺤씤?섏? ?딆븯怨??꾩옱 ?꾩튂???뺤씤?????놁뒿?덈떎. ?대??곗쓽 ?꾩튂 沅뚰븳???덉슜?????ㅼ떆 ?쒕룄?댁＜?몄슂.');
        await invokeAttendance(supabase, { action: 'check-in', ...location });
      }
      await load();
      setMessage('異쒓렐 泥섎━媛 ?꾨즺?섏뿀?듬땲??');
      alert('異쒓렐 泥섎━媛 ?꾨즺?섏뿀?듬땲??');
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
      setMessage('? 留ㅼ옣 異쒓렐 ?붿껌??蹂대깉?듬땲??');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function requestAction(action, requestId, decision = '') {
    setBusy(true);
    setMessage('');
    try {
      await invokeAttendance(supabase, { action, request_id: requestId, decision });
      setMessage(decision === 'approved' ? '?뱀씤?덉뒿?덈떎.' : decision === 'rejected' ? '諛섎젮?덉뒿?덈떎.' : '?붿껌??痍⑥냼?덉뒿?덈떎.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function retrySheetSync(recordId) {
    setBusy(true);
    setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'retry-sheet-sync', record_id: recordId });
      setMessage('洹쇰Т?쒖뿉 ?ㅼ떆 諛섏쁺?덉뒿?덈떎.');
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="attendancePage"><h2>洹쇰Т</h2><LoadingState /></section>;
  if (!status?.enabled && !superAdmin) {
    return <section className="attendancePage"><h2>洹쇰Т</h2><EmptyState>洹쇰Т 湲곕뒫 ?ъ슜 沅뚰븳???놁뒿?덈떎.</EmptyState></section>;
  }

  return (
    <section className="attendancePage">
      <div className="attendanceTitleRow">
        <div><p className="attendanceEyebrow">?몄갔而댄띁??/p><h2>洹쇰Т</h2></div>
        <button type="button" className="attendanceRefresh" onClick={load}>?덈줈怨좎묠</button>
      </div>

      {tabs.length > 1 && <div className="attendanceTopTabs" aria-label="異쒓렐 ?꾪솴 諛?留ㅼ옣 異쒓렐 ?ㅼ젙 硫붾돱" style={{ '--attendance-tab-count': tabs.length }}>
        {tabs.map(tab => <button key={tab.key} className={view === tab.key ? 'active' : ''} onClick={() => setView(tab.key)}>{tab.label}</button>)}
      </div>}

      {message && <div className="attendanceMessage" role="status">{message}</div>}

      {view === 'attendance' && <>
        <div className="attendanceSummaryGrid">
          <article><span>?ㅻ뒛 ?좎쭨</span><strong>{status?.today || '-'}</strong></article>
          <article><span>異쒓렐 ?곹깭</span><strong>{status?.record ? `異쒓렐 ?꾨즺 ${formatTime(status.record.checked_in_at)}` : status?.schedule?.dayOff ? '?대Т' : '異쒓렐 ??}</strong></article>
        </div>

        <div className="attendancePanel attendanceCheckinPanel">
          <div>
            <h3>?ㅻ뒛 異쒓렐</h3>
            {status?.record
              ? <p>{formatDateTime(status.record.checked_in_at)} 쨌 {status.record.checkin_store_name} 쨌 {status.record.verification_method === 'wifi' ? '留ㅼ옣 WiFi' : '留ㅼ옣 ?꾩튂'}</p>
              : <p>{status?.scheduleError || '留ㅼ옣 WiFi ?먮뒗 ?꾩튂媛 ?뺤씤?섎㈃ 異쒓렐?????덉뒿?덈떎.'}</p>}
          </div>
          <button type="button" className="attendancePrimary" disabled={busy || Boolean(status?.record) || Boolean(status?.schedule?.dayOff) || Boolean(status?.scheduleError)} onClick={checkIn}>
            {status?.record ? '異쒓렐 ?꾨즺' : '異쒓렐?섍린'}
          </button>
        </div>

        <div className="attendanceTwoColumn">
          <div className="attendancePanel">
            <h3>? 留ㅼ옣 異쒓렐 ?붿껌</h3>
            <p className="attendanceHelp">?뚯냽 留ㅼ옣 異쒓렐? 洹몃?濡?媛?ν븯硫? ?뱀씤??? 留ㅼ옣? ?대떦 ?좎쭨????踰??ъ슜?????덉뒿?덈떎. ?뱀씪 ?붿껌? ??12???꾧퉴吏留?媛?ν빀?덈떎.</p>
            <form className="attendanceForm" onSubmit={submitOtherStore}>
              <label>異쒓렐 ?좎쭨<input type="date" value={requestForm.work_date} min={status?.today} onChange={event => setRequestForm({ ...requestForm, work_date: event.target.value })} required /></label>
              <label>異쒓렐 留ㅼ옣<select value={requestForm.destination_store_id} onChange={event => setRequestForm({ ...requestForm, destination_store_id: event.target.value })} required><option value="">?좏깮</option>{(status?.stores || []).filter(store => store.name !== user.store_name).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
              <label className="full">?ъ쑀<textarea value={requestForm.reason} onChange={event => setRequestForm({ ...requestForm, reason: event.target.value })} placeholder="? 留ㅼ옣?먯꽌 異쒓렐?댁빞 ?섎뒗 ?댁쑀瑜??낅젰?댁＜?몄슂." required /></label>
              <button type="submit" className="attendanceSecondary" disabled={busy}>?뱀씤 ?붿껌</button>
            </form>
            <div className="attendanceCards">
              {(status?.requests || []).length ? status.requests.map(request => <article key={request.id}>
                <div><strong>{request.work_date} 쨌 {request.destination_store_name}</strong><span>{request.reason}</span></div>
                <div className="attendanceCardRight"><em className={`attendanceBadge ${request.status}`}>{request.status === 'pending' ? '?뱀씤 ?湲? : request.status === 'approved' ? '?뱀씤 ?꾨즺' : request.status === 'rejected' ? '諛섎젮' : request.status === 'used' ? '?ъ슜 ?꾨즺' : '痍⑥냼'}</em>{['pending', 'approved'].includes(request.status) && <button type="button" disabled={busy} onClick={() => requestAction('cancel-request', request.id)}>痍⑥냼</button>}</div>
              </article>) : <EmptyState>吏꾪뻾 以묒씤 ? 留ㅼ옣 異쒓렐 ?붿껌???놁뒿?덈떎.</EmptyState>}
            </div>
          </div>

          <div className="attendancePanel">
            <h3>??異쒓렐 ?대젰</h3>
            <div className="attendanceDesktopTable"><table><thead><tr><th>?좎쭨</th><th>異쒓렐?쒓컙</th><th>留ㅼ옣</th><th>?뺤씤</th><th>洹쇰Т??/th></tr></thead><tbody>{(status?.history || []).map(record => <tr key={record.id}><td>{record.work_date}</td><td>{formatDateTime(record.checked_in_at).split(' ').slice(-2).join(' ')}</td><td>{record.checkin_store_name}</td><td>{record.verification_method === 'wifi' ? 'WiFi' : '?꾩튂'}</td><td>{record.sheet_sync_status === 'synced' ? '諛섏쁺 ?꾨즺' : <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>?ㅼ떆 諛섏쁺</button>}</td></tr>)}</tbody></table></div>
            <div className="attendanceMobileList">{(status?.history || []).map(record => <article key={record.id}><div><strong>{record.work_date}</strong><span>{record.checkin_store_name} 쨌 {record.verification_method === 'wifi' ? 'WiFi' : '?꾩튂'}</span></div><div><strong>{formatDateTime(record.checked_in_at).split(' ').slice(-2).join(' ')}</strong>{record.sheet_sync_status === 'synced' ? <span>洹쇰Т??諛섏쁺</span> : <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>?ㅼ떆 諛섏쁺</button>}</div></article>)}</div>
            {!(status?.history || []).length && <EmptyState>異쒓렐 ?대젰???놁뒿?덈떎.</EmptyState>}
          </div>
        </div>

      </>}

      {view === 'records' && canViewTodayAttendance && <div className="attendancePanel attendanceTodayPanel">
        <div className="attendancePanelHeading">
          <div><h3>?뱀씪 異쒓렐 ?댁뿭</h3><p className="attendanceHelp">{status?.today} 異쒓렐 湲곕줉怨?援ш? 洹쇰Т??諛섏쁺 ?щ??낅땲??</p></div>
        </div>
        <div className="attendanceTodaySummary">
          <article><span>?ㅻ뒛 異쒓렐</span><strong>{todayAttendance.summary.total}紐?/strong></article>
          <article><span>諛섏쁺 ?꾨즺</span><strong>{todayAttendance.summary.synced}紐?/strong></article>
          <article><span>諛섏쁺 以?/span><strong>{todayAttendance.summary.pending}紐?/strong></article>
          <article className={todayAttendance.summary.failed ? 'warning' : ''}><span>諛섏쁺 ?ㅽ뙣</span><strong>{todayAttendance.summary.failed}紐?/strong></article>
        </div>
        <div className="attendanceDesktopTable"><table><thead><tr><th>吏곸썝</th><th>?뚯냽 留ㅼ옣</th><th>異쒓렐 留ㅼ옣</th><th>異쒓렐 ?쒓컖</th><th>?뺤씤 諛⑹떇</th><th>援ш? 洹쇰Т??/th></tr></thead><tbody>
          {todayAttendance.records.map(record => <tr key={record.id}><td>{record.employee_name}</td><td>{record.home_store_name}</td><td>{record.checkin_store_name}</td><td>{formatTime(record.checked_in_at)}</td><td>{record.verification_method === 'wifi' ? 'WiFi' : 'GPS'}</td><td><span className={`attendanceSyncBadge ${record.sheet_sync_status}`}>{sheetSyncLabel(record.sheet_sync_status)}</span>{record.sheet_sync_status !== 'synced' && <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>?ㅼ떆 諛섏쁺</button>}</td></tr>)}
        </tbody></table></div>
        <div className="attendanceMobileList attendanceTodayMobile">
          {todayAttendance.records.map(record => <article key={record.id}>
            <div><strong>{record.employee_name}</strong><span>{record.home_store_name} 쨌 {formatTime(record.checked_in_at)}</span><span>異쒓렐 留ㅼ옣 {record.checkin_store_name} 쨌 {record.verification_method === 'wifi' ? 'WiFi' : 'GPS'}</span></div>
            <div className="attendanceCardRight"><span className={`attendanceSyncBadge ${record.sheet_sync_status}`}>{sheetSyncLabel(record.sheet_sync_status)}</span>{record.sheet_sync_status !== 'synced' && <button type="button" className="attendanceRetry" disabled={busy} onClick={() => retrySheetSync(record.id)}>?ㅼ떆 諛섏쁺</button>}</div>
          </article>)}
        </div>
        {!todayAttendance.records.length && <EmptyState>?ㅻ뒛 異쒓렐??吏곸썝???놁뒿?덈떎.</EmptyState>}
      </div>}

      {view === 'approvals' && canApprove && <div className="attendancePanel">
          <h3>? 留ㅼ옣 異쒓렐 ?뱀씤</h3>
          <div className="attendanceCards approval">{pending.length ? pending.map(request => <article key={request.id}>
            <div><strong>{request.employee_name} 쨌 {request.work_date}</strong><span>{request.home_store_name} ??{request.destination_store_name}</span><span>{request.reason}</span></div>
            <div className="attendanceApprovalButtons"><button disabled={busy} onClick={() => requestAction('decide-request', request.id, 'rejected')}>諛섎젮</button><button className="attendancePrimary" disabled={busy} onClick={() => requestAction('decide-request', request.id, 'approved')}>?뱀씤</button></div>
          </article>) : <EmptyState>?뱀씤 ?湲?以묒씤 ?붿껌???놁뒿?덈떎.</EmptyState>}</div>
        </div>}

      {view === 'settings' && superAdmin && <StoreAttendanceSettings supabase={supabase} />}
    </section>
  );
}

export function FeatureAccessManager({ supabase }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [savedDraft, setSavedDraft] = useState({});
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [bulkFeature, setBulkFeature] = useState('attendance');
  const [bulkMode, setBulkMode] = useState('enabled');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const nextData = await invokeAttendance(supabase, { action: 'admin-data' });
      const nextDraft = {};
      for (const employee of nextData.employees || []) {
        nextDraft[employee.id] = {};
        for (const feature of FEATURE_DEFINITIONS) {
          const row = (nextData.overrides || []).find(item =>
            item.scope_type === 'employee' && item.employee_id === employee.id && item.feature_key === feature.key
          );
          nextDraft[employee.id][feature.key] = row ? (row.enabled ? 'enabled' : 'disabled') : 'inherit';
        }
      }
      setData(nextData);
      setDraft(nextDraft);
      setSavedDraft(JSON.parse(JSON.stringify(nextDraft)));
      setSelected(previous => previous.filter(id => nextData.employees?.some(employee => employee.id === id)));
    }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);

  const stores = useMemo(() => [...new Set((data?.employees || []).map(employee => employee.store_name).filter(Boolean))].sort(), [data]);
  const roles = useMemo(() => [...new Set((data?.employees || []).map(employee => employee.role).filter(Boolean))].sort(), [data]);
  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data?.employees || []).filter(employee =>
      (storeFilter === 'all' || employee.store_name === storeFilter) &&
      (roleFilter === 'all' || employee.role === roleFilter) &&
      (!keyword || `${employee.name} ${employee.store_name} ${employee.role}`.toLowerCase().includes(keyword))
    );
  }, [data, search, storeFilter, roleFilter]);
  const changed = useMemo(() => Object.keys(draft).flatMap(employeeId =>
    FEATURE_DEFINITIONS.filter(feature => draft[employeeId]?.[feature.key] !== savedDraft[employeeId]?.[feature.key])
      .map(feature => ({ target_id: employeeId, feature_key: feature.key, mode: draft[employeeId][feature.key] }))
  ), [draft, savedDraft]);
  const visibleIds = filteredEmployees.map(employee => employee.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.includes(id));

  function setMode(employeeId, featureKey, mode) {
    setDraft(previous => ({ ...previous, [employeeId]: { ...previous[employeeId], [featureKey]: mode } }));
  }

  function toggleVisibleSelection() {
    setSelected(previous => allVisibleSelected
      ? previous.filter(id => !visibleIds.includes(id))
      : [...new Set([...previous, ...visibleIds])]);
  }

  function applyBulk() {
    if (!selected.length) return setMessage('癒쇱? 吏곸썝???좏깮?댁＜?몄슂.');
    setDraft(previous => {
      const next = { ...previous };
      for (const employeeId of selected) next[employeeId] = { ...next[employeeId], [bulkFeature]: bulkMode };
      return next;
    });
    setMessage(`${selected.length}紐낆쓽 ${FEATURE_DEFINITIONS.find(item => item.key === bulkFeature)?.label} ?ㅼ젙??蹂寃쏀뻽?듬땲?? ?꾨옒 ???踰꾪듉???뚮윭 理쒖쥌 諛섏쁺?댁＜?몄슂.`);
  }

  async function saveAll() {
    if (!changed.length) return setMessage('??ν븷 蹂寃쎌궗??씠 ?놁뒿?덈떎.');
    setBusy(true); setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'save-feature-overrides', changes: changed });
      setMessage(`${changed.length}媛쒖쓽 湲곕뒫 ?ъ슜 沅뚰븳????ν뻽?듬땲??`);
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!data) return <LoadingState />;
  return <section className="attendancePage">
    <div className="attendanceTitleRow">
      <div><p className="attendanceEyebrow">理쒓퀬愿由ъ옄 ?꾩슜</p><h2>湲곕뒫 ?ъ슜 沅뚰븳</h2></div>
    </div>
    <div className="attendancePanel">
    <h3>吏곸썝蹂?湲곕뒫 ?ㅼ젙</h3>
    <p className="attendanceHelp">吏곸썝愿由?紐⑸줉泥섎읆 ???붾㈃?먯꽌 寃?됀룹꽑?앺븯怨??щ윭 吏곸썝??湲곕뒫???쒓볼踰덉뿉 ?ㅼ젙?????덉뒿?덈떎. 湲곗〈 ??븷 沅뚰븳???믪씠吏 ?딄퀬 ?좏깮??湲곕뒫???ъ슜 ?щ?留??쒗븳?⑸땲??</p>
    {message && <div className="attendanceMessage">{message}</div>}
    <div className="featureAccessToolbar">
      <input aria-label="吏곸썝 寃?? value={search} onChange={event => setSearch(event.target.value)} placeholder="吏곸썝紐끒룸ℓ?Β룹쭅梨?寃?? />
      <select aria-label="留ㅼ옣 ?꾪꽣" value={storeFilter} onChange={event => setStoreFilter(event.target.value)}><option value="all">?꾩껜 留ㅼ옣</option>{stores.map(store => <option key={store}>{store}</option>)}</select>
      <select aria-label="吏곸콉 ?꾪꽣" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">?꾩껜 吏곸콉</option>{roles.map(role => <option key={role}>{role}</option>)}</select>
    </div>
    <div className="featureBulkBar">
      <strong>{selected.length}紐??좏깮</strong>
      <select aria-label="?쇨큵 ?곸슜 湲곕뒫" value={bulkFeature} onChange={event => setBulkFeature(event.target.value)}>{FEATURE_DEFINITIONS.map(feature => <option key={feature.key} value={feature.key}>{feature.label}</option>)}</select>
      <select aria-label="?쇨큵 ?곸슜 ?곹깭" value={bulkMode} onChange={event => setBulkMode(event.target.value)}><option value="enabled">?ъ슜</option><option value="disabled">誘몄궗??/option><option value="inherit">湲곕낯媛?/option></select>
      <button type="button" className="attendanceSecondary" onClick={applyBulk} disabled={busy}>?좏깮 吏곸썝 ?쇨큵 ?곸슜</button>
    </div>
    <div className="featureAccessTable attendanceDesktopTable">
      <table>
        <thead><tr><th><input type="checkbox" aria-label="?꾩옱 紐⑸줉 ?꾩껜 ?좏깮" checked={allVisibleSelected} onChange={toggleVisibleSelection} /></th><th>吏곸썝</th><th>?뚯냽쨌吏곸콉</th>{FEATURE_DEFINITIONS.map(feature => <th key={feature.key}>{feature.label}</th>)}</tr></thead>
        <tbody>{filteredEmployees.map(employee => <tr key={employee.id}>
          <td><input type="checkbox" aria-label={`${employee.name} ?좏깮`} checked={selected.includes(employee.id)} onChange={() => setSelected(previous => previous.includes(employee.id) ? previous.filter(id => id !== employee.id) : [...previous, employee.id])} /></td>
          <td><strong>{employee.name}</strong></td><td>{employee.store_name} 쨌 {employee.role}</td>
          {FEATURE_DEFINITIONS.map(feature => <td key={feature.key}><select aria-label={`${employee.name} ${feature.label}`} value={draft[employee.id]?.[feature.key] || 'inherit'} onChange={event => setMode(employee.id, feature.key, event.target.value)}><option value="inherit">湲곕낯媛?/option><option value="enabled">?ъ슜</option><option value="disabled">誘몄궗??/option></select></td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="featureAccessMobileList">
      {filteredEmployees.map(employee => <article key={employee.id}>
        <header><label><input type="checkbox" checked={selected.includes(employee.id)} onChange={() => setSelected(previous => previous.includes(employee.id) ? previous.filter(id => id !== employee.id) : [...previous, employee.id])} /><span><strong>{employee.name}</strong><small>{employee.store_name} 쨌 {employee.role}</small></span></label></header>
        <div>{FEATURE_DEFINITIONS.map(feature => <label key={feature.key}><span>{feature.label}</span><select value={draft[employee.id]?.[feature.key] || 'inherit'} onChange={event => setMode(employee.id, feature.key, event.target.value)}><option value="inherit">湲곕낯媛?/option><option value="enabled">?ъ슜</option><option value="disabled">誘몄궗??/option></select></label>)}</div>
      </article>)}
    </div>
    {!filteredEmployees.length && <EmptyState>議곌굔??留욌뒗 吏곸썝???놁뒿?덈떎.</EmptyState>}
    <div className="featureAccessSaveBar"><span>蹂寃쎌궗??{changed.length}媛?/span><button type="button" className="attendancePrimary" onClick={saveAll} disabled={busy || !changed.length}>{busy ? '???以? : '?꾩껜 蹂寃쎌궗?????}</button></div>
    </div>
  </section>;
}

function StoreAttendanceSettings({ supabase }) {
  const [data, setData] = useState(null);
  const [storeId, setStoreId] = useState('');
  const [form, setForm] = useState({ enabled: false, auth_mode: 'either', address: '', latitude: '', longitude: '', radius_meters: 100, default_start_time: '', ips: '' });
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
    setForm({ enabled: Boolean(setting.enabled), auth_mode: setting.auth_mode || 'either', address: setting.address || '', latitude: setting.latitude ?? '', longitude: setting.longitude ?? '', radius_meters: setting.radius_meters || 100, default_start_time: setting.default_start_time || '', ips });
  }, [data, storeId]);

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await invokeAttendance(supabase, { action: 'save-store-setting', store_id: storeId, ...form, ips: form.ips.split(/[,\n]/).map(value => value.trim()).filter(Boolean) });
      setMessage('留ㅼ옣 異쒓렐 ?ㅼ젙????ν뻽?듬땲??'); await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!data) return <LoadingState />;
  return <div className="attendancePanel">
    <h3>留ㅼ옣쨌?щТ??異쒓렐 ?ㅼ젙</h3>
    <p className="attendanceHelp">留ㅼ옣怨??щТ?ㅼ쓽 二쇱냼 ?먮뒗 吏???꾩튂? WiFi瑜??깅줉?⑸땲?? WiFi ?먮뒗 GPS 以??섎굹媛 ?뺤씤?섎㈃ 異쒓렐?????덈룄濡??ㅼ젙?섎뒗 諛⑹떇??沅뚯옣?⑸땲??</p>
    {message && <div className="attendanceMessage">{message}</div>}
    <form className="storeAttendanceForm" onSubmit={save}>
      <label>留ㅼ옣<select value={storeId} onChange={event => setStoreId(event.target.value)}>{(data.stores || []).map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
      <label className="toggleLabel"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} /> 異쒓렐 湲곕뒫 ?쒖꽦??/label>
      <label>?뺤씤 諛⑹떇<select value={form.auth_mode} onChange={event => setForm({ ...form, auth_mode: event.target.value })}><option value="either">WiFi ?먮뒗 GPS</option><option value="wifi">WiFi留?/option><option value="gps">GPS留?/option></select></label>
      <label>湲곕낯 異쒓렐?쒓컙<input type="time" value={form.default_start_time} onChange={event => setForm({ ...form, default_start_time: event.target.value })} /></label>
      <AttendanceLocationPicker value={form} onMessage={setMessage} onChange={changes => setForm(previous => ({ ...previous, ...changes }))} />
      <label className="full">GPS ?덉슜 諛섍꼍(m)<input type="number" min="30" max="1000" value={form.radius_meters} onChange={event => setForm({ ...form, radius_meters: event.target.value })} /></label>
      <label className="full">留ㅼ옣 WiFi 怨듭씤 IP<textarea value={form.ips} onChange={event => setForm({ ...form, ips: event.target.value })} placeholder="IP媛 ?щ윭 媛쒕㈃ 以꾩쓣 諛붽퓭 ?낅젰?댁＜?몄슂." /></label>
      {data.current_ip && <button type="button" className="attendanceSecondary full" onClick={() => setForm({ ...form, ips: [...new Set([...form.ips.split(/[,\n]/).map(value => value.trim()).filter(Boolean), data.current_ip])].join('\n') })}>?꾩옱 ?묒냽 IP 異붽?: {data.current_ip}</button>}
      <button type="submit" className="attendancePrimary full" disabled={busy}>留ㅼ옣 ?ㅼ젙 ???/button>
    </form>
  </div>;
}


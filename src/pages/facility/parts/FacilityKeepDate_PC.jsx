import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { ChevronLeft, ChevronRight, Store, ArrowRight, Info, Clock } from 'lucide-react';

const FacilityKeepDate_PC = ({ facilityId, isMobile }) => {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // スケジュール同期State
  const [occupiedDates, setOccupiedDates] = useState([]); 
  const [keepDates, setKeepDates] = useState([]); 
  const [regularRules, setRegularRules] = useState([]); // 🆕 全施設の定期ルール
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toLocaleDateString('sv-SE');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { fetchPartners(); }, [facilityId]);
  useEffect(() => { if (selectedShop) fetchData(); }, [currentDate, selectedShop]);

  const fetchPartners = async () => {
    const { data } = await supabase.from('shop_facility_connections').select(`*, profiles (*)`).eq('facility_user_id', facilityId).eq('status', 'active');
    setShops(data || []);
    if (data && data.length > 0 && !selectedShop) setSelectedShop(data[0].profiles);
  };

  const fetchData = async () => {
    if (!selectedShop) return;
    setLoading(true);
    const shopId = selectedShop.id;
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

    const [resData, privData, visitData, ngData, keeps, conns] = await Promise.all([
      supabase.from('reservations').select('start_time').eq('shop_id', shopId).gte('start_time', startOfMonth).lte('start_time', endOfMonth + 'T23:59:59'),
      supabase.from('private_tasks').select('start_time').eq('shop_id', shopId).gte('start_time', startOfMonth).lte('start_time', endOfMonth + 'T23:59:59'),
      supabase.from('visit_requests').select('scheduled_date').eq('shop_id', shopId).neq('status', 'canceled'),
      supabase.from('shop_ng_dates').select('date').eq('shop_id', shopId),
      supabase.from('keep_dates').select('*').eq('shop_id', shopId),
      supabase.from('shop_facility_connections').select('facility_user_id, regular_rules').eq('shop_id', shopId) // 🆕 定期ルール取得
    ]);

    const dates = new Set();
    resData.data?.forEach(r => dates.add(r.start_time.split('T')[0].split(' ')[0]));
    privData.data?.forEach(p => dates.add(p.start_time.split('T')[0].split(' ')[0]));
    visitData.data?.forEach(v => dates.add(v.scheduled_date));
    ngData.data?.forEach(n => dates.add(n.date));

    setOccupiedDates(Array.from(dates));
    setKeepDates(keeps.data || []);
    setRegularRules(conns.data || []); // 🆕 保存
    setLoading(false);
  };

  // 🆕 定期キープの判定ロジック
  const checkIsRegularKeep = (date) => {
    const day = date.getDay();
    const dom = date.getDate();
    const m = date.getMonth() + 1;
    const nthWeek = Math.ceil(dom / 7);
    
    const tempNext = new Date(date); tempNext.setDate(dom + 7);
    const isLastWeek = tempNext.getMonth() !== date.getMonth();
    const tempNext2 = new Date(date); tempNext2.setDate(dom + 14);
    const isSecondToLastWeek = (tempNext2.getMonth() !== date.getMonth()) && !isLastWeek;

    let result = null; // 🆕 keeperId単体からオブジェクトへ

    regularRules.forEach(rule => {
      rule.regular_rules?.forEach(r => {
        const monthMatch = (r.monthType === 0) || (r.monthType === 1 && m % 2 !== 0) || (r.monthType === 2 && m % 2 === 0);
        const dayMatch = (r.day === day);
        let weekMatch = (r.week === nthWeek);
        if (r.week === -1) weekMatch = isLastWeek;
        if (r.week === -2) weekMatch = isSecondToLastWeek;

        if (monthMatch && dayMatch && weekMatch) {
          // 🆕 施設IDと設定時間の両方を保持
          result = { keeperId: rule.facility_user_id, time: r.time };
        }
      });
    });
    return result;
  };

  const getStatus = (dateStr) => {
    const d = new Date(dateStr);
    const regKeep = checkIsRegularKeep(d); // 🆕 上で作ったオブジェクトを受け取る

    if (dateStr < todayStr) return 'past';
    
    if (regKeep) {
      return {
        type: regKeep.keeperId === facilityId ? 'keeping' : 'other-keep',
        time: regKeep.time // 🆕 時間を一緒に返す
      };
    }

    // 以下は単一の文字列（'occupied'など）を返す既存ロジックを継続
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const nthWeek = Math.ceil(d.getDate() / 7);
    if (selectedShop?.business_hours?.regular_holidays?.[`${nthWeek}-${dayNames[d.getDay()]}`]) return 'ng';
    if (keepDates.some(k => k.date === dateStr && k.facility_user_id === facilityId)) return 'keeping';
    if (occupiedDates.includes(dateStr)) return 'occupied'; 
    if (keepDates.some(k => k.date === dateStr)) return 'other-keep';
    return 'available';
  };

  const handleDateClick = async (day) => {
    if (!day || !selectedShop) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = getStatus(dateStr);
    if (['past', 'ng', 'occupied', 'other-keep'].includes(status)) return;

    if (status === 'keeping') {
      await supabase.from('keep_dates').delete().match({ date: dateStr, facility_user_id: facilityId, shop_id: selectedShop.id });
    } else {
      await supabase.from('keep_dates').upsert({ date: dateStr, facility_user_id: facilityId, shop_id: selectedShop.id });
    }
    fetchData();
  };

  const myKeeps = keepDates.filter(k => k.facility_user_id === facilityId);
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = [...Array(firstDay).fill(null), ...[...Array(lastDate).keys()].map(i => i + 1)];

  if (loading && !selectedShop) return <div style={{textAlign:'center', padding:'50px'}}>読み込み中...</div>;

  return (
    <div style={containerStyle(isMobile)}>
      {/* 左：業者選択 */}
      {!isMobile && (
        <aside style={sideListStyle}>
          <h3 style={sideTitle}><Store size={18} /> 提携業者を選択</h3>
          <div style={shopListWrapper}>
            {shops.map(con => (
              <button key={con.profiles.id} onClick={() => setSelectedShop(con.profiles)} style={shopCardBtn(selectedShop?.id === con.profiles.id, con.profiles.theme_color)}>
                <div style={shopMiniTag(con.profiles.theme_color)}>{con.profiles.business_type}</div>
                <div style={shopNameLabel}>{con.profiles.business_name}</div>
              </button>
            ))}
          </div>
        </aside>
      )}

      <main style={{ flex: 1 }}>
        {!selectedShop ? (
          <div style={noShopStyle}>提携業者がいません。提携してからご利用ください。</div>
        ) : (
          <>
            <div style={calHeaderStyle}>
              <div style={monthNav}>
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={navBtn}><ChevronLeft /></button>
                <h2 style={monthLabel}>{year}年 {month + 1}月</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={navBtn}><ChevronRight /></button>
              </div>
              <div style={statusBanner(selectedShop?.theme_color)}>
                <Info size={16} />
                <span><strong>{selectedShop?.business_name}</strong> さんの空き状況：<strong>「◎」</strong> の日を独占キープできます</span>
              </div>
            </div>

            {/* --- カレンダー本体のグリッド --- */}
<div style={calendarGrid}>
  {['日', '月', '火', '水', '木', '金', '土'].map(w => <div key={w} style={weekHeader}>{w}</div>)}
  
  {days.map((day, i) => {
    if (!day) return <div key={i} style={emptyDay}></div>;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 🆕 修正：getStatusからデータを受け取る（オブジェクトか文字列か判定）
    const statusData = getStatus(dateStr);
    const status = typeof statusData === 'object' ? statusData.type : statusData;
    const regTime = typeof statusData === 'object' ? statusData.time : null;

    const config = {
      keeping: { bg: '#fff9e6', border: '#c5a059', color: '#c5a059', label: '選択中', icon: '★' },
      occupied: { bg: '#fef2f2', border: '#fee2e2', color: '#94a3b8', label: '予約あり', icon: '✕' },
      ng: { bg: '#f8fafc', border: '#f1f5f9', color: '#94a3b8', label: '定休日', icon: '✕' },
      other_keep: { bg: '#f8fafc', border: '#f1f5f9', color: '#94a3b8', label: '他施設', icon: '✕' },
      past: { bg: '#fff', border: '#fff', color: '#eee', label: '-', icon: '' },
      available: { bg: '#fff', border: '#f0f0f0', color: '#c5a059', label: '空き', icon: '◎' }
    };

    // keyの不一致（ハイフンありなし）を吸収
    const s = config[status === 'other-keep' ? 'other_keep' : status] || config.past;

    return (
      <div 
        key={i} 
        onClick={() => handleDateClick(day)} 
        style={dayBox(s.bg, s.border, status)}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={dayNum(status)}>{day}</span>

          {/* 🆕 修正：定期キープの時間（regTime）があれば表示する */}
          {status === 'keeping' && regTime && (
            <span style={{
              fontSize: '0.65rem', 
              color: '#c5a059', 
              fontWeight: '900', 
              marginLeft: 'auto', 
              marginRight: '4px',
              background: '#fff',
              padding: '1px 4px',
              borderRadius: '4px',
              border: '1px solid #f0e6d2'
            }}>
              {regTime}
            </span>
          )}

          <span style={{fontSize:'0.6rem', fontWeight:'bold', color: s.color}}>{s.label}</span>
        </div>
        <div style={statusIconArea(s.color)}>{s.icon}</div>
      </div>
    );
  })}
</div>

            {/* 下部凡例 */}
            <div style={legendArea}>
              <div style={legendItem}><span style={dot('#fffbeb', '#c5a059')}></span> ★ 選択中</div>
              <div style={legendItem}><span style={dot('#fef2f2', '#fee2e2')}></span> ✕ 予約あり</div>
              <div style={legendItem}><span style={dot('#f8fafc', '#f1f5f9')}></span> ✕ 定休日/他施設</div>
              <div style={legendItem}><span style={dot('#fff', '#eee')}></span> ◎ 空き</div>
            </div>

            {myKeeps.length > 0 && (
              <div style={actionBox}>
                <div style={keepInfo}>確保中の日数：<strong>{myKeeps.length}日</strong></div>
                <button style={nextBtn}>利用者様の選択へ進む <ArrowRight size={18} /></button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// スタイル
const containerStyle = (isMobile) => ({ display: 'flex', gap: '30px', width: '100%', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' });
const sideListStyle = { width: '280px', flexShrink: 0, background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #eee' };
const sideTitle = { fontSize: '0.9rem', fontWeight: 'bold', color: '#3d2b1f', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' };
const shopListWrapper = { display: 'flex', flexDirection: 'column', gap: '10px' };
const shopCardBtn = (active, color) => ({ padding: '15px', borderRadius: '12px', border: active ? `2px solid ${color}` : '1px solid #f1f5f9', background: active ? `${color}05` : '#fff', textAlign: 'left', cursor: 'pointer', width: '100%', transition: '0.2s' });
const shopMiniTag = (color) => ({ fontSize: '0.6rem', color: color, fontWeight: 'bold', marginBottom: '2px' });
const shopNameLabel = { fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' };
const calHeaderStyle = { marginBottom: '20px' };
const monthNav = { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px', justifyContent: 'center' };
const monthLabel = { fontSize: '1.8rem', fontWeight: '900', color: '#3d2b1f', margin: 0, minWidth: '180px', textAlign: 'center' };
const navBtn = { background: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statusBanner = (color) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', background: '#fcfaf7', borderRadius: '12px', fontSize: '0.85rem', color: '#3d2b1f', border: '1px solid #f0e6d2' });
const calendarGrid = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', background: '#fff', padding: '15px', borderRadius: '24px', border: '1px solid #eee' };
const weekHeader = { textAlign: 'center', padding: '10px', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8' };
const dayBox = (bg, border, status) => ({ minHeight: '90px', padding: '10px', borderRadius: '16px', cursor: status === 'available' || status === 'keeping' ? 'pointer' : 'default', background: bg, border: `2px solid ${border}`, display: 'flex', flexDirection: 'column' });
const dayNum = (status) => ({ fontSize: '1.1rem', fontWeight: '900', color: status === 'available' || status === 'keeping' ? '#1e293b' : '#cbd5e1' });
const statusIconArea = (color) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '900', color: color });
const emptyDay = { minHeight: '90px' };
const noShopStyle = { textAlign: 'center', padding: '100px', background: '#fff', borderRadius: '24px', color: '#999' };
const actionBox = { marginTop: '20px', background: '#3d2b1f', padding: '20px 40px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' };
const keepInfo = { color: '#fff', fontSize: '1rem' };
const nextBtn = { background: '#c5a059', color: '#3d2b1f', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' };
const legendArea = { display: 'flex', gap: '15px', justifyContent: 'center', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #eee', marginTop: '15px' };
const legendItem = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' };
const dot = (bg, border) => ({ width: '10px', height: '10px', borderRadius: '3px', background: bg, border: `1px solid ${border}` });

export default FacilityKeepDate_PC;
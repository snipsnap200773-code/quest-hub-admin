import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "../../../supabaseClient";
import { Clock, Calendar, Save, Zap } from 'lucide-react';

const ScheduleSettings = () => {
  const { shopId } = useParams();

  // --- 1. State 管理 (インターバル系を追加) ---
  const [message, setMessage] = useState('');
  const [shopData, setShopData] = useState(null);
  const [businessHours, setBusinessHours] = useState({});
  const [regularHolidays, setRegularHolidays] = useState({});
  
  // 🆕 GeneralSettingsから移設したState
  const [bufferPreparationMin, setBufferPreparationMin] = useState(0);
  const [minLeadTimeHours, setMinLeadTimeHours] = useState(0);
  const [autoFillLogic, setAutoFillLogic] = useState(true);

  const dayMap = { mon: '月曜日', tue: '火曜日', wed: '水曜日', thu: '木曜日', fri: '金曜日', sat: '土曜日', sun: '日曜日' };
  const weekLabels = [
    { key: '1', label: '第1' }, { key: '2', label: '第2' }, { key: '3', label: '第3' },
    { key: '4', label: '第4' }, { key: 'L2', label: '最後から2' }, { key: 'L1', label: '最後' }
  ];

  useEffect(() => {
    if (shopId) fetchScheduleData();
  }, [shopId]);

  const fetchScheduleData = async () => {
    // 🆕 移設したカラムも合わせて取得
    const { data } = await supabase.from('profiles').select('*').eq('id', shopId).single();
    if (data) {
      setShopData(data);
      setBusinessHours(data.business_hours || {});
      setRegularHolidays(data.business_hours?.regular_holidays || {});
      // 移設データのセット
      setBufferPreparationMin(data.buffer_preparation_min || 0);
      setMinLeadTimeHours(data.min_lead_time_hours || 0);
      setAutoFillLogic(data.auto_fill_logic ?? true);
    }
  };

  const showMsg = (txt) => { setMessage(txt); setTimeout(() => setMessage(''), 3000); };

  const toggleHoliday = (weekKey, dayKey) => {
    const key = `${weekKey}-${dayKey}`;
    setRegularHolidays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- 💾 保存ロジック (統合) ---
  const handleSave = async () => {
    const updatedBusinessHours = { ...businessHours, regular_holidays: regularHolidays };
    const { error } = await supabase.from('profiles').update({ 
      business_hours: updatedBusinessHours,
      // 🆕 移設した設定値もここで保存
      buffer_preparation_min: bufferPreparationMin,
      min_lead_time_hours: minLeadTimeHours,
      auto_fill_logic: autoFillLogic
    }).eq('id', shopId);

    if (!error) showMsg('全スケジュール設定を保存しました！');
    else alert('保存に失敗しました。');
  };

  const themeColor = shopData?.theme_color || '#2563eb';
  const containerStyle = { width: '100%', maxWidth: '700px', margin: '0 auto', padding: '15px', paddingBottom: '120px', boxSizing: 'border-box', fontFamily: 'sans-serif' };
  const cardStyle = { marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box', width: '100%', overflow: 'hidden' };
  const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', background: '#fff', width: '90px', boxSizing: 'border-box' };
  const selectStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: '#fff' };

  return (
    <div style={containerStyle}>
      {message && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', padding: '15px', background: '#dcfce7', color: '#166534', borderRadius: '8px', zIndex: 1001, textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{message}</div>}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calendar size={24} /> 営業スケジュール・予約制限
      </h2>

      {/* ⏰ 曜日別営業時間・休憩 */}
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Clock size={20} /> 曜日別営業時間・休憩</h3>
        {Object.keys(dayMap).map(day => (
          <div key={day} style={{ borderBottom: '1px solid #f1f5f9', padding: '15px 0' }}>
            <b style={{ fontSize: '0.95rem', color: '#1e293b', display: 'block', marginBottom: '10px' }}>{dayMap[day]}</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', width: '30px', color: '#64748b', fontWeight: 'bold' }}>営業</span>
                <input type="time" value={businessHours[day]?.open || '09:00'} onChange={(e) => setBusinessHours({...businessHours, [day]: {...businessHours[day], open: e.target.value}})} style={inputStyle} />
                <span style={{ color: '#cbd5e1' }}>〜</span>
                <input type="time" value={businessHours[day]?.close || '18:00'} onChange={(e) => setBusinessHours({...businessHours, [day]: {...businessHours[day], close: e.target.value}})} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', width: '30px', color: '#64748b', fontWeight: 'bold' }}>休憩</span>
                <input type="time" value={businessHours[day]?.rest_start || ''} onChange={(e) => setBusinessHours({...businessHours, [day]: { ...businessHours[day], rest_start: e.target.value }})} style={inputStyle} />
                <span style={{ color: '#cbd5e1' }}>〜</span>
                <input type="time" value={businessHours[day]?.rest_end || ''} onChange={(e) => setBusinessHours({...businessHours, [day]: { ...businessHours[day], rest_end: e.target.value }})} style={inputStyle} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 🆕 ⚙️ 予約受付ルールの詳細 (GeneralSettingsから移設) */}
      <section style={{ ...cardStyle, border: `2px solid ${themeColor}` }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', color: themeColor, display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={20} /> 予約受付ルールの詳細</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>インターバル（準備時間）</label>
          <select value={bufferPreparationMin} onChange={(e) => setBufferPreparationMin(parseInt(e.target.value))} style={selectStyle}>
            <option value={0}>なし</option>
            {[10, 15, 20, 30].map(m => <option key={m} value={m}>{m}分</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>直近の予約制限（何時間前まで受付可能か）</label>
          <select value={minLeadTimeHours} onChange={(e) => setMinLeadTimeHours(parseInt(e.target.value))} style={selectStyle}>
            <option value={0}>当日OK</option>
            <option value={2}>2時間先NG</option>
            <option value={3}>3時間先NG</option>
            <option value={24}>当日NG</option>
            <option value={48}>翌日までNG</option>
            <option value={72}>翌々日までNG</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoFillLogic} onChange={(e) => setAutoFillLogic(e.target.checked)} style={{ width: '22px', height: '22px' }} />
          <b style={{ fontSize: '0.9rem' }}>自動詰め機能を有効にする</b>
        </label>
      </section>

      {/* 📅 定休日の設定 */}
      <section style={{ ...cardStyle, border: '2px solid #ef4444' }}>
        <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Calendar size={20} /> 定休日の設定</h3>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'left' }}>週</th>
                {Object.keys(dayMap).map(d => <th key={d} style={{ padding: '8px', fontSize: '0.8rem' }}>{dayMap[d].charAt(0)}</th>)}
              </tr>
            </thead>
            <tbody>
              {weekLabels.map(week => (
                <tr key={week.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0', fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap' }}>{week.label}</td>
                  {Object.keys(dayMap).map(day => {
                    const isActive = regularHolidays[`${week.key}-${day}`];
                    return (
                      <td key={day} style={{ padding: '4px', textAlign: 'center' }}>
                        <button onClick={() => toggleHoliday(week.key, day)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #eee', background: isActive ? '#ef4444' : '#fff', color: isActive ? '#fff' : '#cbd5e1', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer' }}>
                          {isActive ? '休' : '◯'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', borderRadius: '12px', border: '1px dashed #ef4444' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#991b1b', flex: 1 }}>定休日が祝日の場合は営業する</span>
            <div onClick={() => setRegularHolidays(prev => ({...prev, open_on_holiday: !prev.open_on_holiday}))} style={{ width: '50px', height: '28px', background: regularHolidays.open_on_holiday ? '#10b981' : '#cbd5e1', borderRadius: '20px', position: 'relative', transition: '0.3s' }}>
              <div style={{ position: 'absolute', top: '2px', left: regularHolidays.open_on_holiday ? '24px' : '2px', width: '24px', height: '24px', background: '#fff', borderRadius: '50%', transition: '0.3s' }} />
            </div>
          </label>
        </div>
      </section>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #eee', zIndex: 1000 }}>
        <button onClick={handleSave} style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: themeColor, color: '#fff', border: 'none', borderRadius: '40px', fontWeight: 'bold', fontSize: '1rem', boxShadow: `0 8px 25px ${themeColor}66`, cursor: 'pointer' }}>
          <Save size={20} /> 設定を保存する 💾
        </button>
      </div>
    </div>
  );
};

export default ScheduleSettings;
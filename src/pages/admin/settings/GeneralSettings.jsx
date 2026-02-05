import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "../../../supabaseClient";
import bcrypt from 'bcryptjs';
import { Settings, Shield, Palette, Layout, Save, Link as LinkIcon } from 'lucide-react';

const GeneralSettings = () => {
  const { shopId } = useParams();
  const [message, setMessage] = useState('');
  const [shopData, setShopData] = useState(null);

  // --- 1. State 管理 (外観、同期、表示拡張、セキュリティに限定) ---
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [scheduleSyncId, setScheduleSyncId] = useState('');
  const [extraSlotsBefore, setExtraSlotsBefore] = useState(0);
  const [extraSlotsAfter, setExtraSlotsAfter] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => { if (shopId) fetch(); }, [shopId]);

  const fetch = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', shopId).single();
    if (data) {
      setShopData(data);
      setThemeColor(data.theme_color || '#2563eb');
      setScheduleSyncId(data.schedule_sync_id || '');
      setExtraSlotsBefore(data.extra_slots_before || 0);
      setExtraSlotsAfter(data.extra_slots_after || 0);
    }
  };

  const showMsg = (txt) => { setMessage(txt); setTimeout(() => setMessage(''), 3000); };

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
      theme_color: themeColor,
      schedule_sync_id: scheduleSyncId,
      extra_slots_before: extraSlotsBefore,
      extra_slots_after: extraSlotsAfter
    }).eq('id', shopId);

    if (!error) showMsg('基本設定を保存しました！');
    else alert('保存に失敗しました。');
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) { alert("セキュリティのため、パスワードは8文字以上に設定してください。"); return; }
    if (window.confirm("パスワードを更新します。一度更新されると運営者もあなたのパスワードを知ることはできなくなります。よろしいですか？")) {
      const salt = bcrypt.genSaltSync(10);
      const hashed = bcrypt.hashSync(newPassword, salt);
      const { error } = await supabase.from('profiles').update({ hashed_password: hashed, admin_password: '********' }).eq('id', shopId);
      if (!error) { showMsg('パスワードを安全に更新しました！'); setNewPassword(''); setIsChangingPassword(false); }
    }
  };

  const cardStyle = { marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', boxSizing: 'border-box', width: '100%' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem', background: '#fff' };
  const btnActiveS = (val, target) => ({ padding: '12px 5px', background: val === target ? themeColor : '#fff', color: val === target ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '20px', paddingBottom: '120px' }}>
      {message && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', padding: '15px', background: '#dcfce7', color: '#166534', borderRadius: '8px', zIndex: 1001, textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{message}</div>}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={24} /> 基本設定・セキュリティ</h2>

      {/* 🎨 外観設定 */}
      <section style={{ ...cardStyle, borderLeft: `6px solid ${themeColor}` }}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem', color: themeColor, display: 'flex', alignItems: 'center', gap: '6px' }}><Palette size={18} /> お店のテーマカラー</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ width: '50px', height: '50px', border: 'none', background: 'none', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>メインカラー：<span style={{ color: themeColor }}>{themeColor}</span></div>
          </div>
        </div>
      </section>

      {/* 🔗 スケジュール共有 */}
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><LinkIcon size={18} /> スケジュール共有設定</h3>
        <input placeholder="共有用の合言葉" value={scheduleSyncId} onChange={(e) => setScheduleSyncId(e.target.value)} style={inputStyle} />
      </section>

      {/* 📌 管理画面の表示拡張 */}
      <section style={{ ...cardStyle, background: '#fdfcf5', border: '2px solid #eab308' }}>
        <h3 style={{ marginTop: 0, color: '#a16207', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Layout size={20} /> 管理画面の表示拡張</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>☀ 開店前の表示コマ数:</label>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <button key={n} type="button" onClick={() => setExtraSlotsBefore(n)} style={{ ...btnActiveS(extraSlotsBefore, n), width: '38px', height: '38px' }}>{n}</button>)}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>🌙 閉店後の表示コマ数:</label>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <button key={n} type="button" onClick={() => setExtraSlotsAfter(n)} style={{ ...btnActiveS(extraSlotsAfter, n), width: '38px', height: '38px' }}>{n}</button>)}
          </div>
        </div>
      </section>

      {/* 🔐 セキュリティ設定 */}
      <section style={{ ...cardStyle, border: `2px solid #1e293b` }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={18} /> セキュリティ設定</h3>
        {!isChangingPassword ? (
          <button onClick={() => setIsChangingPassword(true)} style={{ width: '100%', padding: '15px', border: `1px solid #1e293b`, color: '#1e293b', background: '#fff', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>パスワードを変更する</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="新しいパスワード" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleUpdatePassword} style={{ flex: 1, padding: '15px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>安全に保存</button>
              <button onClick={() => setIsChangingPassword(false)} style={{ flex: 1, padding: '15px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>キャンセル</button>
            </div>
          </div>
        )}
      </section>

      <button onClick={handleSave} style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '18px 35px', background: themeColor, color: '#fff', border: 'none', borderRadius: '40px', fontWeight: 'bold', boxShadow: `0 8px 30px ${themeColor}66`, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <Save size={20} /> 全設定を保存する 💾
      </button>
    </div>
  );
};

export default GeneralSettings;
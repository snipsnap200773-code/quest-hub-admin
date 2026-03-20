import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; 
import { 
  Building2, Plus, MapPin, Calendar, Users, 
  ChevronRight, X, Save, User, ArrowLeft, Phone, Mail, Trash2, Edit3, Clock, Copy, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 定数定義（既存システムから継承）
const DAYS = [
  { label: "月", value: 1 }, { label: "火", value: 2 }, { label: "水", value: 3 },
  { label: "木", value: 4 }, { label: "金", value: 5 }, { label: "土", value: 6 }, { label: "日", value: 0 }
];
const WEEKS = [
  { label: "第1週", value: 1 }, { label: "第2週", value: 2 }, { label: "第3週", value: 3 },
  { label: "第4週", value: 4 }, { label: "最終週", value: -1 }, { label: "最後から2番目", value: -2 }
];
const MONTH_TYPES = [
  { label: "毎月", value: 0 }, { label: "奇数月", value: 1 }, { label: "偶数月", value: 2 }
];

const FacilityManagement = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // フォームState（既存システムをベースに tenant_id を追加）
  const [formData, setFormData] = useState({ 
    name: '', pw: '', email: '', address: '', tel: '', regular_rules: [], tenant_id: shopId 
  });

  const [selDay, setSelDay] = useState(1);
  const [selWeek, setSelWeek] = useState(1);
  const [selMonthType, setSelMonthType] = useState(0);

  useEffect(() => {
    fetchFacilities();
  }, [shopId]);

  const fetchFacilities = async () => {
    setLoading(true);
    // 💡 tenant_id で絞り込むことで、自分の店舗の施設だけを表示
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('tenant_id', shopId)
      .order('created_at', { ascending: true });
    
    if (!error) setFacilities(data);
    setLoading(false);
  };

  const addRule = () => {
    const exists = formData.regular_rules?.some(r => r.day === selDay && r.week === selWeek && r.monthType === selMonthType);
    if (exists) return;
    const newRule = { day: selDay, week: selWeek, monthType: selMonthType, time: '09:00' };
    setFormData({ ...formData, regular_rules: [...(formData.regular_rules || []), newRule] });
  };

  const removeRule = (idx) => {
    const newRules = formData.regular_rules.filter((_, i) => i !== idx);
    setFormData({ ...formData, regular_rules: newRules });
  };

  // 3. handleSave を「新規なら insert、編集なら update」に整理
const handleSave = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  if (editingId) {
    // 編集の場合
    const { error } = await supabase
      .from('facilities')
      .update(formData)
      .eq('id', editingId);
    if (error) alert(error.message);
  } else {
    // 新規登録の場合（idは自動生成されるので含めない）
    const { error } = await supabase
      .from('facilities')
      .insert([formData]);
    if (error) alert(error.message);
  }

  setIsModalOpen(false);
  fetchFacilities();
  resetForm();
  setLoading(false);
};

  const handleDelete = async (f) => {
    if (!window.confirm(`施設名: ${f.name} を削除してもよろしいですか？`)) return;
    const { error } = await supabase.from('facilities').delete().eq('id', f.id);
    if (!error) fetchFacilities();
  };

  const openEdit = (f) => {
    setEditingId(f.id);
    setFormData({ ...f, tenant_id: shopId });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', pw: '', email: '', address: '', tel: '', regular_rules: [], tenant_id: shopId });
    setSelMonthType(0);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link to={`/admin/${shopId}/dashboard`} style={backBtnStyle}><ArrowLeft size={20} /></Link>
          <div>
            <h1 style={titleStyle}>全施設名簿マスター</h1>
            <p style={subtitleStyle}>契約施設の管理・定期ルール設定</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} style={addBtnStyle}>
          <Plus size={20} /> 新規施設登録
        </button>
      </header>

      {loading ? <p style={{textAlign:'center', padding: '40px', color: '#94a3b8'}}>読込中...</p> : (
        <div style={gridStyle}>
          {facilities.map((f) => (
            <motion.div key={f.id} whileHover={{ scale: 1.01 }} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{ flex: 1 }}>
                  <h2 style={facilityNameStyle}>{f.name}</h2>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span style={idBadgeStyle}>ID: {f.id}</span>
                    <span style={pwBadgeStyle}>PW: {f.pw}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => openEdit(f)} style={iconBtnStyle}><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(f)} style={{...iconBtnStyle, color: '#ef4444'}}><Trash2 size={18} /></button>
                </div>
              </div>

              <div style={ruleSectionStyle}>
                <div style={sectionLabelStyle}><Clock size={14} /> 定期キープ：</div>
                <div style={ruleBadgeContainer}>
                  {f.regular_rules?.map((r, i) => (
                    <span key={i} style={ruleBadgeStyle}>
                      {r.monthType === 1 ? '奇数月 ' : r.monthType === 2 ? '偶数月 ' : ''}
                      {WEEKS.find(w => w.value === r.week)?.label}{DAYS.find(d=>d.value===r.day)?.label}曜
                    </span>
                  ))}
                  {(!f.regular_rules || f.regular_rules.length === 0) && <span style={{fontSize:'12px', color:'#cbd5e1'}}>設定なし</span>}
                </div>
              </div>
              
              <div style={infoGridStyle}>
                <div style={infoItemStyle}><Mail size={14} /> {f.email || "未登録"}</div>
                <div style={infoItemStyle}><MapPin size={14} /> {f.address || "未登録"}</div>
                <div style={infoItemStyle}><Phone size={14} /> {f.tel || "未登録"}</div>
              </div>

              <div style={inviteBoxStyle}>
                <div style={inviteLabelStyle}>施設担当者用ログインURL</div>
                <div style={inviteInputGroupStyle}>
                  <input 
                    readOnly 
                    value={`${window.location.origin}/facility-login/${f.id}`} 
                    style={inviteInputStyle} 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/facility-login/${f.id}`;
                      navigator.clipboard.writeText(`【${f.name}様 専用】\n入居者名簿の入力・確認はこちらからお願いします。\n\nURL: ${url}\nパスワード: ${f.pw}`);
                      alert('招待メッセージをコピーしました！LINEなどで送ってください。');
                    }}
                    style={copyBtnStyle}
                  >
                    <Copy size={14} /> コピー
                  </button>
                </div>
              </div>

              <Link to={`/admin/${shopId}/facilities/${f.id}/residents`} style={linkBtnStyle}>
                入居者名簿を確認 <ChevronRight size={18} />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* 登録・編集モーダル */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              style={modalContentStyle} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={modalHeaderStyle}>
                <h3 style={{margin:0, color:'#1e3a8a'}}>{editingId ? "施設情報の編集" : "新規施設登録"}</h3>
                <button onClick={() => setIsModalOpen(false)} style={{border:'none', background:'none'}}><X /></button>
              </div>

              <form onSubmit={handleSave} style={formContainerStyle}>
                <div style={scrollAreaStyle}>
                  <div style={formGridStyle}>
                    <label style={labelStyle}>施設名
                      <input style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="例: あおバの里" />
                    </label>
                    <label style={labelStyle}>パスワード
                      <input style={inputStyle} value={formData.pw} onChange={e => setFormData({...formData, pw: e.target.value})} required />
                    </label>
                    <label style={labelStyle}>通知用メールアドレス
                      <input style={inputStyle} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@gmail.com" />
                    </label>
                    <label style={labelStyle}>住所
                      <input style={inputStyle} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="東京都町田市..." />
                    </label>
                    <label style={labelStyle}>電話番号
                      <input style={inputStyle} value={formData.tel} onChange={e => setFormData({...formData, tel: e.target.value})} placeholder="03-1234-5678" />
                    </label>

                    {/* 定期ルール設定（既存ロジックを維持） */}
                    <div style={ruleConfigBoxStyle}>
                      <div style={{fontWeight:'bold', fontSize:'13px', color:'#1e3a8a', marginBottom:'12px'}}>📅 定期キープの設定</div>
                      
                      <div style={tinyLabelStyle}>月の条件</div>
                      <div style={tileGridStyle}>
                        {MONTH_TYPES.map(m => (
                          <button key={m.value} type="button" onClick={() => setSelMonthType(m.value)} 
                            style={{...tileBtnStyle, backgroundColor: selMonthType === m.value ? '#4f46e5' : '#fff', color: selMonthType === m.value ? '#fff' : '#444'}}>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div style={{...tinyLabelStyle, marginTop:'10px'}}>曜日</div>
                      <div style={tileGridStyle}>
                        {DAYS.map(d => (
                          <button key={d.value} type="button" onClick={() => setSelDay(d.value)} 
                            style={{...tileBtnStyle, backgroundColor: selDay === d.value ? '#4f46e5' : '#fff', color: selDay === d.value ? '#fff' : '#444'}}>
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <div style={{...tinyLabelStyle, marginTop:'10px'}}>週</div>
                      <div style={tileGridStyle}>
                        {WEEKS.map(w => (
                          <button key={w.value} type="button" onClick={() => setSelWeek(w.value)} 
                            style={{...tileBtnStyle, backgroundColor: selWeek === w.value ? '#4f46e5' : '#fff', color: selWeek === w.value ? '#fff' : '#444'}}>
                            {w.label}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={addRule} style={ruleAddBtnStyle}>ルールを追加 ➔</button>
                      
                      <div style={ruleListAreaStyle}>
                        {formData.regular_rules?.map((r, i) => (
                          <div key={i} style={ruleBadgeItemStyle}>
                            <span>
                              {r.monthType === 1 ? '奇数 ' : r.monthType === 2 ? '偶数 ' : ''}
                              {WEEKS.find(w=>w.value===r.week)?.label}{DAYS.find(d=>d.value===r.day)?.label}曜
                            </span>
                            <button type="button" onClick={() => removeRule(i)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={modalFooterStyle}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={cancelBtnStyle}>キャンセル</button>
                  <button type="submit" style={saveBtnStyle}>{loading ? '保存中...' : '設定を保存'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// スタイル定義（QUEST HUBのデザインに最適化）
const containerStyle = { maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', minHeight: '100vh', background: '#f8fafc' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const titleStyle = { margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' };
const subtitleStyle = { margin: '5px 0 0', fontSize: '0.85rem', color: '#64748b' };
const backBtnStyle = { padding: '10px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' };
const addBtnStyle = { background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))', gap: '20px' };
const cardStyle = { background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const facilityNameStyle = { margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' };
const idBadgeStyle = { background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' };
const pwBadgeStyle = { background: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' };
const iconBtnStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' };
const ruleSectionStyle = { background: '#f8fafc', padding: '12px', borderRadius: '16px', marginBottom: '15px' };
const sectionLabelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' };
const ruleBadgeContainer = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const ruleBadgeStyle = { background: '#4f46e515', color: '#4f46e5', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' };
const infoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' };
const infoItemStyle = { fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' };
const linkBtnStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1e293b', color: '#fff', padding: '12px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' };

const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContentStyle = { background: '#fff', width: '100%', maxWidth: '450px', maxHeight: '90vh', borderRadius: '28px', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', paddingRight: '10px' };
const formGridStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const labelStyle = { fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'flex', flexDirection: 'column', gap: '5px' };
const inputStyle = { padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' };
const ruleConfigBoxStyle = { background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' };
const tinyLabelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' };
const tileGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '5px' };
const tileBtnStyle = { padding: '8px 2px', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };
const ruleAddBtnStyle = { width: '100%', marginTop: '15px', padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const ruleListAreaStyle = { marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '8px' };
const ruleBadgeItemStyle = { background: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
const modalFooterStyle = { display: 'flex', gap: '10px', marginTop: '25px' };
const cancelBtnStyle = { flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' };
const saveBtnStyle = { flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const formContainerStyle = { display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const inviteBoxStyle = { marginTop: '15px', padding: '12px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '15px' };
const inviteLabelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' };
const inviteInputGroupStyle = { display: 'flex', gap: '8px' };
const inviteInputStyle = { flex: 1, fontSize: '0.7rem', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#64748b', outline: 'none' };
const copyBtnStyle = { display: 'flex', alignItems: 'center', gap: '5px', background: '#0369a1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' };

export default FacilityManagement;
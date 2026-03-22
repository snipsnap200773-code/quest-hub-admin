import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Users, UserPlus, Search, Edit3, Trash2, 
  ArrowUpDown, Info, X 
} from 'lucide-react'; // 🆕 X を追加しました
import { motion, AnimatePresence } from 'framer-motion';

const FacilityUserList_PC = ({ facilityId, isMobile }) => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('room_number');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', name_kana: '', room_number: '', 
    has_wheelchair: false, needs_bed_cut: false, memo: ''
  });

  useEffect(() => {
    fetchResidents();
  }, [facilityId, sortBy]);

  const fetchResidents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('residents')
      .select('*')
      .eq('facility_user_id', facilityId)
      .eq('is_active', true)
      .order(sortBy, { ascending: true });
    
    setResidents(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...formData, facility_user_id: facilityId };
    
    if (editingId) {
      await supabase.from('residents').update(payload).eq('id', editingId);
    } else {
      await supabase.from('residents').insert([payload]);
    }

    setIsModalOpen(false);
    resetForm();
    fetchResidents();
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`「${name}」様の名簿データを削除しますか？`)) {
      await supabase.from('residents').update({ is_active: false }).eq('id', id);
      fetchResidents();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', name_kana: '', room_number: '', has_wheelchair: false, needs_bed_cut: false, memo: '' });
  };

  const filteredResidents = residents.filter(r => 
    r.name.includes(searchTerm) || (r.room_number || "").includes(searchTerm)
  );

  if (loading) return <div style={{textAlign: 'center', padding: '100px', color: '#3d2b1f'}}>名簿を読み込み中...</div>;

  return (
    <div style={{ width: '100%' }}>
      {/* 操作バー */}
      <div style={actionBarStyle(isMobile)}>
        <div style={searchBoxStyle(isMobile)}>
          <Search size={20} style={searchIconStyle} />
          <input 
            placeholder="お名前や部屋番号で検索" 
            style={searchInputStyle}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={btnGroupStyle(isMobile)}>
          <button onClick={() => setSortBy(sortBy === 'room_number' ? 'name' : 'room_number')} style={sortBtnStyle(isMobile)}>
            <ArrowUpDown size={18} /> {sortBy === 'room_number' ? '部屋順' : '名前順'}
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} style={addBtnStyle(isMobile)}>
            <UserPlus size={18} /> 新規登録
          </button>
        </div>
      </div>

      <div style={countLabelStyle}>登録数: {filteredResidents.length}名</div>

      {/* 名簿グリッド */}
      <div style={gridStyle(isMobile)}>
        {filteredResidents.map(r => (
          <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={residentCardStyle(isMobile)}>
            <div style={cardMainStyle(isMobile)}>
              <div style={roomBadgeStyle}>{r.room_number ? `${r.room_number}号室` : '部屋なし'}</div>
              <div style={nameGroupStyle(isMobile)}>
                <h3 style={nameDisplay}>{r.name}</h3>
                <span style={kanaDisplay}>{r.name_kana}</span>
              </div>
              <div style={flagRowStyle}>
                {r.has_wheelchair && <span style={flagStyle('#f3f4f6', '#374151')}>車椅子</span>}
                {r.needs_bed_cut && <span style={flagStyle('#fee2e2', '#ef4444')}>ベッド</span>}
              </div>
              {r.memo && (
                <div style={memoBox(isMobile)}>
                  <Info size={12} style={{marginTop: '2px', flexShrink: 0}} />
                  <span>{r.memo}</span>
                </div>
              )}
            </div>
            <div style={cardActionStyle(isMobile)}>
              <button onClick={() => { setEditingId(r.id); setFormData(r); setIsModalOpen(true); }} style={miniBtnStyle('#f1f5f9', '#475569', isMobile)}>
                <Edit3 size={16} /> {!isMobile && '編集'}
              </button>
              <button onClick={() => handleDelete(r.id, r.name)} style={miniBtnStyle('#fee2e2', '#ef4444', isMobile)}>
                <Trash2 size={16} /> {!isMobile && '削除'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* モーダル */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={modalOverlay} onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={modalContent(isMobile)} onClick={e => e.stopPropagation()}>
              <div style={modalHeader}>
                <h2 style={{margin: 0, fontSize: '1.2rem'}}>{editingId ? '入居者情報の編集' : '新しい入居者の追加'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={closeBtn}><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} style={formStyle}>
                <div style={inputRow}>
                  <div style={inputGroup}><label style={labelStyle}>お名前（必須）</label><input required style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例: 山田 太郎" /></div>
                  <div style={inputGroup}><label style={labelStyle}>ふりがな</label><input style={inputStyle} value={formData.name_kana} onChange={e => setFormData({...formData, name_kana: e.target.value})} placeholder="例: やまだ たろう" /></div>
                </div>
                <div style={inputGroup}><label style={labelStyle}>部屋番号</label><input style={inputStyle} value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} placeholder="例: 201" /></div>
                <div style={checkGroup}>
                  <label style={checkLabel}><input type="checkbox" checked={formData.has_wheelchair} onChange={e => setFormData({...formData, has_wheelchair: e.target.checked})} /> 車椅子を利用している</label>
                  <label style={checkLabel}><input type="checkbox" checked={formData.needs_bed_cut} onChange={e => setFormData({...formData, needs_bed_cut: e.target.checked})} /> ベッド上でのカットが必要</label>
                </div>
                <div style={inputGroup}><label style={labelStyle}>メモ・要望（スタッフ用）</label><textarea style={{...inputStyle, height: '80px'}} value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} placeholder="例: 短め希望" /></div>
                <button type="submit" style={saveBtnStyle}>名簿を保存する</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- スタイル定義 ---
const actionBarStyle = (isMobile) => ({ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', marginBottom: '15px', justifyContent: isMobile ? 'flex-start' : 'space-between', alignItems: isMobile ? 'flex-start' : 'center', width: '100%', boxSizing: 'border-box' });
const searchBoxStyle = (isMobile) => ({ flex: isMobile ? '1' : 'none', width: isMobile ? '100%' : '300px', position: 'relative' });
const searchIconStyle = { position: 'absolute', left: '15px', top: '15px', color: '#999' };
const searchInputStyle = { width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const btnGroupStyle = (isMobile) => ({ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexShrink: 0 });
const addBtnStyle = (isMobile) => ({ flex: isMobile ? '1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '0' : '0 25px', height: '54px', borderRadius: '12px', background: '#3d2b1f', color: '#c5a059', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' });
const sortBtnStyle = (isMobile) => ({ flex: isMobile ? '1' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '0' : '0 20px', height: '54px', borderRadius: '12px', background: '#fff', color: '#3d2b1f', border: '1px solid #ddd', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' });
const countLabelStyle = { fontSize: '0.9rem', color: '#999', marginBottom: '20px', fontWeight: 'bold' };
const gridStyle = (isMobile) => ({ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' });
const residentCardStyle = (isMobile) => ({ background: '#fff', borderRadius: '16px', padding: '15px 20px', border: '1px solid #eee', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', gap: isMobile ? '15px' : '20px' });
const cardMainStyle = (isMobile) => ({ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '20px', width: isMobile ? '100%' : 'auto' });
const roomBadgeStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#c5a059', background: '#fcfaf7', padding: '5px 10px', borderRadius: '8px', display: 'inline-block', border: '1px solid #f0e6d2', whiteSpace: 'nowrap', flexShrink: 0 };
const nameGroupStyle = (isMobile) => ({ display: 'flex', flexDirection: 'column', minWidth: isMobile ? 'auto' : '150px' });
const nameDisplay = { margin: 0, fontSize: '1.2rem', color: '#3d2b1f', fontWeight: 'bold' };
const kanaDisplay = { fontSize: '0.8rem', color: '#999', fontWeight: 'normal' };
const flagRowStyle = { display: 'flex', gap: '8px', flexShrink: 0 };
const flagStyle = (bg, color) => ({ fontSize: '0.7rem', fontWeight: 'bold', background: bg, color: color, padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' });
const memoBox = (isMobile) => ({ padding: '10px 15px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1, marginLeft: isMobile ? '0' : '10px' });
const cardActionStyle = (isMobile) => ({ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center', marginLeft: isMobile ? '0' : 'auto', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-start' : 'flex-end', flexShrink: 0 });
const miniBtnStyle = (bg, color, isMobile) => ({ padding: '10px 15px', borderRadius: '10px', background: bg, color: color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' });
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(61, 43, 31, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContent = (isMobile) => ({ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: isMobile ? '25px' : '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' });
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const closeBtn = { background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const inputRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '0.85rem', fontWeight: 'bold', color: '#666' };
const inputStyle = { padding: '14px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' };
const checkGroup = { display: 'flex', flexDirection: 'column', gap: '10px', background: '#fcfaf7', padding: '15px', borderRadius: '12px' };
const checkLabel = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' };
const saveBtnStyle = { background: '#3d2b1f', color: '#c5a059', border: 'none', padding: '18px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '10px' };

export default FacilityUserList_PC;
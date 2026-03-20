import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Users, UserPlus, Search, Building2, 
  Save, LogOut, ChevronRight, X, Trash2, Check,
  Edit3,
  Calendar, AlertCircle,
  Store, CalendarCheck // 🆕 この2つを追加
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FacilityPortal = () => {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // モーダル・フォーム管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', name_kana: '', room_number: '', 
    has_wheelchair: false, needs_bed_cut: false, memo: ''
  });

  // --- 🆕 追加：訪問リクエスト管理用のState ---
  const [activeRequest, setActiveRequest] = useState(null); // 現在進行中の訪問予定
  const [selectedResidentIds, setSelectedResidentIds] = useState([]); // 今回カットする人のIDリスト
  const [isRequestSaving, setIsRequestSaving] = useState(false); // 保存中フラグ

  // 🆕 認証チェック（プラットフォーム統合仕様）
  useEffect(() => {
    const loggedInId = sessionStorage.getItem('facility_user_id');
    const isActive = sessionStorage.getItem('facility_auth_active');

    // ログインしていない、またはURLのIDとログインIDが一致しない場合は戻す
    if (!isActive || loggedInId !== facilityId) {
      navigate(`/facility-login/${facilityId}`);
      return;
    }
    fetchData();
  }, [facilityId]);

  const [connectedShops, setConnectedShops] = useState([]); // 🆕 提携店舗用のStateをコンポーネント内に追加してください

  const fetchData = async () => {
    setLoading(true);
    
    // 1. 施設マスター情報の取得
    const { data: fData } = await supabase.from('facility_users').select('*').eq('id', facilityId).single();
    if (fData) setFacility(fData);

    // 2. 提携している「サービス（店舗）」の一覧を取得
    const { data: shopData } = await supabase
      .from('shop_facility_connections')
      .select(`*, profiles (id, business_name, business_type, theme_color)`)
      .eq('facility_user_id', facilityId)
      .eq('status', 'active');
    setConnectedShops(shopData || []);

    // --- 🆕 追加：進行中の訪問依頼（未完了の最新1件）をDBから取得 ---
    const { data: reqData } = await supabase
      .from('visit_requests')
      .select('*, visit_request_residents(resident_id)')
      .eq('facility_user_id', facilityId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reqData) {
      setActiveRequest(reqData);
      // DBに保存済みのメンバーがいればチェック状態を復元
      setSelectedResidentIds(reqData.visit_request_residents.map(r => r.resident_id));
    } else {
      setActiveRequest(null);
      // 予約がない場合は、現在の手元での選択（selectedResidentIds）を維持します
    }

    // 3. 共通入居者名簿の取得
    const { data: rData } = await supabase
      .from('residents')
      .select('*')
      .eq('facility_user_id', facilityId)
      .eq('is_active', true)
      .order('room_number', { ascending: true });
    
    setResidents(rData || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // 🆕 古い facility_id ではなく、新しい facility_user_id をセットする
    const payload = { ...formData, facility_user_id: facilityId }; 
    
    let error;
    if (editingId) {
      const { error: err } = await supabase.from('residents').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('residents').insert([payload]);
      error = err;
    }

    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
  };

  // --- 🆕 追加：名簿のチェック操作と、訪問依頼の保存ロジック ---

  // 名簿の左側にあるチェック円をタップした時の動作
  const handleToggleResident = (id) => {
    // 💡 予約がなくてもチェック可能にします（Scenario C: 名簿 ➔ 予約 のため）
    setSelectedResidentIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  // 「一時保存」または「確定」ボタンを押した時の動作
  const handleSaveVisitList = async (isConfirming = false) => {
    if (!activeRequest) return;
    setIsRequestSaving(true);
    
    try {
      // 1. 一旦、今回のリクエストに紐付いている名簿データをリセット（最新の状態にするため）
      await supabase.from('visit_request_residents').delete().eq('request_id', activeRequest.id);

      // 2. 現在チェックが入っている人を一括で登録
      if (selectedResidentIds.length > 0) {
        const inserts = selectedResidentIds.map(rid => ({
          request_id: activeRequest.id,
          resident_id: rid
        }));
        await supabase.from('visit_request_residents').insert(inserts);
      }

      // 3. 「確定する」が押された場合は、依頼自体のステータスを更新
      if (isConfirming) {
        if (selectedResidentIds.length === 0) {
          alert('カット希望者が0名の状態で確定はできません。');
          setIsRequestSaving(false);
          return;
        }
        await supabase.from('visit_requests')
          .update({ is_list_confirmed: true, status: 'confirmed' })
          .eq('id', activeRequest.id);
        
        alert(`【${facility.name}様】\n名簿を最終確定しました。三土手さんに通知されます。`);
      } else {
        alert('名簿の選択状態を一時保存しました。');
      }
      
      // 画面のデータを最新にする
      fetchData();
    } catch (err) {
      console.error('保存エラー:', err);
      alert('保存中にエラーが発生しました。');
    } finally {
      setIsRequestSaving(false);
    }
  };

  // --- 🆕 アップグレード：カレンダー画面へ移動して日程を確保する ---
  const handleCreateFixedRequest = async () => {
    if (!facility) return;

    // 1. まずこの施設が提携している店舗（SnipSnapなど）のIDを取得
    // ※今はSnipSnap固定ですが、将来的に複数業者から選べるようにここを拡張します
    const { data: connection } = await supabase
      .from('shop_facility_connections')
      .select('shop_id')
      .eq('facility_user_id', facilityId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!connection) {
      alert("提携している店舗が見つかりません。店舗側での承認が必要です。");
      return;
    }

    // 2. 既存のカレンダー画面へ遷移
    // mode: 'facility' を渡すことで、カレンダー側で「施設用枠確保」として動かします
    navigate(`/shop/${connection.shop_id}/reserve/time`, { 
      state: { 
        mode: 'facility',
        facilityUserId: facilityId,
        totalSlotsNeeded: 12, // 施設訪問用に3時間分（15分×12コマ）などの枠を想定
      } 
    });
  };

  // --- 追加ここまで ---

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', name_kana: '', room_number: '', has_wheelchair: false, needs_bed_cut: false, memo: '' });
  };

  const filteredResidents = residents.filter(r => 
    r.name.includes(searchTerm) || (r.room_number || "").includes(searchTerm)
  );

  if (loading) return <div style={centerStyle}>読み込み中...</div>;

  return (
    <div style={containerStyle}>
      {/* 施設ポータルヘッダー */}
      <header style={headerStyle}>
        <div>
          <div style={facilityLabelStyle}><Building2 size={14} /> QUEST HUB 施設ポータル</div>
          <h1 style={titleStyle}>{facility?.facility_name || "読み込み中..."} 様</h1>
        </div>
        <button 
          onClick={() => { 
            sessionStorage.clear(); // 🆕 セッションを全クリア
            navigate(`/facility-login/${facilityId}`); 
          }} 
          style={logoutBtnStyle}
        >
          <LogOut size={18} /> ログアウト
        </button>
      </header>

      {/* 🆕 提携サービス（SnipSnapなど）セクション */}
      <section style={sectionAreaStyle}>
        <h2 style={sectionTitleStyle}><Store size={18} /> 提携サービス（業者）</h2>
        <div style={shopGridStyle}>
          {connectedShops.map(con => (
            <div key={con.id} style={{...shopCardStyle, borderTop: `4px solid ${con.profiles?.theme_color || '#4f46e5'}`}}>
              <div style={shopInfoStyle}>
                <h3 style={shopNameStyle}>{con.profiles?.shop_name}</h3>
                <span style={shopTagStyle}>{con.profiles?.business_type || '訪問サービス'}</span>
              </div>
              <button 
                onClick={() => navigate(`/shop/${con.shop_id}/reserve/time`, { 
                  state: { mode: 'facility', facilityUserId: facilityId, totalSlotsNeeded: 12 } 
                })}
                style={bookingBtnStyle}
              >
                <CalendarCheck size={16} /> 予約・依頼
              </button>
            </div>
          ))}
          {connectedShops.length === 0 && (
            <div style={emptyCardStyle}>提携中の業者はありません</div>
          )}
        </div>
      </section>

      <div style={{...sectionTitleStyle, marginTop: '30px'}}><Users size={18} /> 共通入居者名簿</div>

      {/* 検索・追加エリア */}
      <div style={actionRowStyle}>
        <div style={searchBoxStyle}>
          <Search size={18} style={searchIconStyle} />
          <input 
            placeholder="名前や部屋番号で検索" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} style={addBtnStyle}>
          <UserPlus size={20} /> 追加
        </button>
      </div>

      {/* 名簿リスト */}
      <div style={{ ...listStyle, paddingBottom: activeRequest ? '140px' : '20px' }}>
        <div style={listCountStyle}>登録数: {residents.length}名</div>
        
        {filteredResidents.map(r => {
          const isSelected = selectedResidentIds.includes(r.id); // 🆕 選択されているか判定
          
          return (
            <motion.div 
              key={r.id} 
              whileTap={{ scale: 0.98 }}
              style={{
                ...residentCardStyle, 
                // 🆕 選択されている時は枠線を紫（#4f46e5）にし、背景を少し明るくする
                border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                background: isSelected ? '#f5f7ff' : '#fff',
              }}
              onClick={() => handleToggleResident(r.id)} // 🆕 クリックでチェックのON/OFF
            >
              {/* 🆕 左側：チェック円（選択状態を表示） */}
              <div style={checkCircleStyle(isSelected)}>
                {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
              </div>

              {/* 中央：入居者情報 */}
              <div style={{ flex: 1 }}>
                <div style={roomNoStyle}>{r.room_number ? `${r.room_number}号室` : '部屋番号未登録'}</div>
                <h3 style={nameStyle}>{r.name} <span style={kanaStyle}>{r.name_kana}</span></h3>
                <div style={tagRowStyle}>
                  {r.has_wheelchair && <span style={tagStyle}>車椅子</span>}
                  {r.needs_bed_cut && <span style={{...tagStyle, background: '#fee2e2', color: '#ef4444'}}>ベッドカット</span>}
                </div>
              </div>

              {/* 🆕 右側：編集ボタン（独立したボタンとして配置） */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // 💡 重要：背後のカードクリックイベントを止める（チェックが走らないように）
                  setEditingId(r.id);
                  setFormData(r);
                  setIsModalOpen(true);
                }}
                style={miniEditBtnStyle}
              >
                <Edit3 size={18} />
              </button>
            </motion.div>
          );
        })}

        {filteredResidents.length === 0 && <div style={emptyTextStyle}>入居者が登録されていません</div>}
      </div>

      {/* 🆕 アップグレード版：状況に合わせてボタンの役割を自動変更 */}
      {!activeRequest ? (
        /* --- 予約（枠）がまだ無いとき --- */
        <div style={floatingBarStyle}>
          <div style={floatingInfoStyle}>
            {selectedResidentIds.length > 0 ? (
              <span style={{color: '#4f46e5'}}><Users size={16} /> {selectedResidentIds.length}名を選択中</span>
            ) : (
              <span style={{color: '#64748b'}}><AlertCircle size={16} /> 次回の予定がありません</span>
            )}
          </div>
          
          <button 
            onClick={() => {
              // 提携店舗（SnipSnapなど）がない場合はエラー
              if (connectedShops.length === 0) return alert("提携店舗が見つかりません");

              // カレンダーへ遷移。名簿が選ばれていればそのリストも一緒に渡す
              navigate(`/shop/${connectedShops[0].profiles.id}/reserve/time`, { 
                state: { 
                  mode: 'facility', 
                  facilityUserId: facilityId, 
                  selectedResidentIds: selectedResidentIds // 0名でもそのまま渡す
                } 
              });
            }}
            style={{
              ...mainActionBtnStyle, 
              background: selectedResidentIds.length > 0 ? '#4f46e5' : '#1e293b'
            }}
          >
            {selectedResidentIds.length > 0 ? (
              <><CalendarCheck size={18} /> このメンバーで日程を選ぶ</>
            ) : (
              <><Calendar size={18} /> まずは訪問日だけキープする</>
            )}
          </button>
        </div>
      ) : (
        /* --- 既に予約（枠）があるとき --- */
        <div style={floatingBarStyle}>
          <div style={floatingInfoStyle}>
             <span style={dateBadgeStyle}>{activeRequest.scheduled_date}</span>
             <span>のカット依頼を編集中（{selectedResidentIds.length}名）</span>
          </div>
          <div style={floatingActionStyle}>
            <button 
              onClick={() => handleSaveVisitList(false)} 
              disabled={isRequestSaving}
              style={subActionBtnStyle}
            >
              一時保存
            </button>
            <button 
              onClick={() => handleSaveVisitList(true)} 
              disabled={isRequestSaving}
              style={mainActionBtnStyle}
            >
              名簿を確定する
            </button>
            {/* 🆕 予定日を変更したい場合もカレンダーへ飛ばす */}
            <button 
              onClick={() => navigate(`/shop/${connectedShops[0].profiles.id}/reserve/time`, { 
                state: { 
                  mode: 'facility', 
                  facilityUserId: facilityId, 
                  requestId: activeRequest.id // 既存の枠IDを渡す
                } 
              })}
              style={{...subActionBtnStyle, width: 'auto', flex: 'none', padding: '14px'}}
            >
              <Calendar size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 入居者登録モーダル */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 50, opacity: 0 }}
              style={modalContentStyle} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={modalHeaderStyle}>
                <h2 style={{margin: 0, fontSize: '1.2rem'}}>{editingId ? '情報を編集' : '新しい入居者を追加'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={closeBtnStyle}><X /></button>
              </div>

              <form onSubmit={handleSave} style={formStyle}>
                <label style={labelStyle}>お名前
                  <input required style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例: 山田 太郎" />
                </label>
                <label style={labelStyle}>ふりがな
                  <input style={inputStyle} value={formData.name_kana} onChange={e => setFormData({...formData, name_kana: e.target.value})} placeholder="例: やまだ たろう" />
                </label>
                <label style={labelStyle}>部屋番号
                  <input style={inputStyle} value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} placeholder="例: 201" />
                </label>

                <div style={checkGroupStyle}>
                  <label style={checkLabelStyle}>
                    <input type="checkbox" checked={formData.has_wheelchair} onChange={e => setFormData({...formData, has_wheelchair: e.target.checked})} />
                    車椅子を利用している
                  </label>
                  <label style={checkLabelStyle}>
                    <input type="checkbox" checked={formData.needs_bed_cut} onChange={e => setFormData({...formData, needs_bed_cut: e.target.checked})} />
                    ベッド上でのカットが必要
                  </label>
                </div>

                <label style={labelStyle}>メモ・要望
                  <textarea style={{...inputStyle, height: '80px'}} value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} placeholder="例: 短め希望、耳は出す" />
                </label>

                <button type="submit" style={saveBtnStyle}>
                  <Save size={18} /> 名簿に保存する
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- スタイル定義（スマホ操作を意識した大きめボタン設計） ---
const containerStyle = { maxWidth: '500px', margin: '0 auto', padding: '20px', minHeight: '100vh', background: '#f8fafc' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', padding: '10px 0' };
const facilityLabelStyle = { fontSize: '0.65rem', fontWeight: 'bold', color: '#4f46e5', background: '#4f46e510', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' };
const titleStyle = { margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' };
const logoutBtnStyle = { background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };
const actionRowStyle = { display: 'flex', gap: '10px', marginBottom: '20px' };
const searchBoxStyle = { flex: 1, position: 'relative' };
const searchIconStyle = { position: 'absolute', left: '12px', top: '14px', color: '#cbd5e1' };
const searchInputStyle = { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem' };
const addBtnStyle = { background: '#1e293b', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const listCountStyle = { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', marginLeft: '5px' };
const residentCardStyle = { background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const roomNoStyle = { fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' };
const nameStyle = { margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 'bold' };
const kanaStyle = { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: '6px' };
const tagRowStyle = { display: 'flex', gap: '6px', marginTop: '10px' };
const tagStyle = { fontSize: '0.7rem', background: '#f0f9ff', color: '#0369a1', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold' };
const emptyTextStyle = { textAlign: 'center', padding: '50px', color: '#cbd5e1', fontSize: '0.9rem' };
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '30px 30px 0 0', padding: '30px', maxHeight: '90vh', overflowY: 'auto' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' };
const inputStyle = { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' };
const checkGroupStyle = { display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '15px' };
const checkLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#1e293b', cursor: 'pointer' };
const saveBtnStyle = { marginTop: '10px', background: '#1e293b', color: '#fff', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' };
const centerStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };

// --- 🆕 追加：名簿選択・チェック円・フローティングバー用のスタイル ---

// チェック状態によって色が変わる円（関数形式）
const checkCircleStyle = (selected) => ({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: selected ? 'none' : '2px solid #cbd5e1',
  background: selected ? '#4f46e5' : 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '15px',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
});

// カード右端の独立した編集ボタン
const miniEditBtnStyle = {
  background: '#f8fafc',
  border: 'none',
  padding: '10px',
  borderRadius: '12px',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};

// 画面下部に固定される保存・確定エリア
const floatingBarStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: '#fff',
  padding: '20px',
  boxShadow: '0 -10px 25px rgba(0,0,0,0.08)',
  zIndex: 900,
  borderTop: '1px solid #e2e8f0'
};

const floatingInfoStyle = {
  fontSize: '0.85rem',
  color: '#1e293b',
  fontWeight: 'bold',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const dateBadgeStyle = {
  background: '#1e293b',
  color: '#fff',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '0.75rem'
};

const floatingActionStyle = {
  display: 'flex',
  gap: '10px'
};

const subActionBtnStyle = {
  flex: 1,
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#475569',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.9rem'
};

const mainActionBtnStyle = {
  flex: 2,
  padding: '14px',
  borderRadius: '14px',
  border: 'none',
  background: '#4f46e5',
  color: '#fff',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.9rem',
  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
};

const sectionAreaStyle = { marginBottom: '30px' };
const sectionTitleStyle = { fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' };
const shopGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' };
const shopCardStyle = { background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' };
const shopNameStyle = { margin: 0, fontSize: '1.1rem', color: '#1e293b' };
const shopTagStyle = { fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px' };
const shopInfoStyle = { flex: 1 };
const bookingBtnStyle = { background: '#1e293b', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const emptyCardStyle = { gridColumn: '1/-1', textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '20px', color: '#cbd5e1', fontSize: '0.8rem', border: '2px dashed #f1f5f9' };

export default FacilityPortal;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Search, Store, Send, CheckCircle2, 
  MapPin, ArrowRight, ChevronLeft,
  AlertCircle, Phone, Mail
} from 'lucide-react';

const ShopSearch = () => {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  
  const [shops, setShops] = useState([]);
  const [connections, setConnections] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (facilityId) fetchInitialData();
  }, [facilityId]);

  const fetchInitialData = async () => {
    setLoading(true);
    
    // 1. 既に申請・提携済みのリストを取得
    const { data: cData } = await supabase
      .from('shop_facility_connections')
      .select('*')
      .eq('facility_user_id', facilityId);
    setConnections(cData || []);

    // 2. 全店舗（profiles）を取得
    const { data: sData } = await supabase
      .from('profiles')
      .select('*')
      .order('business_name', { ascending: true });
    setShops(sData || []);
    
    setLoading(false);
  };

  // 施設から店舗へ提携リクエスト送信
  const sendRequest = async (shopId) => {
    setLoading(true);
    
    // 過去のデータ（拒否等）があれば掃除
    await supabase.from('shop_facility_connections').delete()
      .eq('shop_id', shopId).eq('facility_user_id', facilityId);

    // 新規申請（施設側からなので status: 'pending'）
    const { error } = await supabase.from('shop_facility_connections').insert([
  { 
    shop_id: shopId, 
    facility_user_id: facilityId, 
    status: 'pending',
    created_by_type: 'facility' // 施設が送ったよ！と記録
  }
]);

    if (!error) {
      alert('店舗へ提携リクエストを送信しました！店舗側の承認をお待ちください。');
      fetchInitialData(); 
    } else {
      alert('申請失敗: ' + error.message);
    }
    setLoading(false);
  };

  const filteredShops = shops.filter(s => 
    (s.business_name || "").includes(searchTerm) || 
    (s.business_type || "").includes(searchTerm)
  );

  if (loading) return <div style={centerStyle}>提携可能な業者を探しています...</div>;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}><ChevronLeft size={20} /> 戻る</button>
        <h1 style={titleStyle}>新しい業者を探す</h1>
        <p style={subTitleStyle}>
          施設に訪問可能な美容室・歯科・マッサージ等の業者を検索して提携を依頼できます。
        </p>
      </header>

      {/* 検索窓 */}
      <div style={searchBoxStyle}>
        <Search size={18} style={searchIconStyle} />
        <input 
          placeholder="店名や業種（美容、歯科など）で検索" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      <div style={listStyle}>
        {filteredShops.map(s => {
          const connection = connections.find(c => c.shop_id === s.id);
          
          return (
            <div key={s.id} style={shopCardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{...iconBoxStyle, background: s.theme_color + '15'}}>
                  <Store size={20} color={s.theme_color || "#4f46e5"} />
                </div>
                <div style={infoStyle}>
                  <h3 style={shopNameStyle}>{s.business_name}</h3>
                  <div style={typeTagStyle}>{s.business_type || '未設定'}</div>
                </div>
              </div>

              <div style={contactAreaStyle}>
                <div style={contactItemStyle}><Phone size={14} /> {s.phone || '電話未登録'}</div>
                <div style={contactItemStyle}><Mail size={14} /> {s.email_contact || 'メール未登録'}</div>
              </div>

              <div style={actionAreaStyle}>
                {connection ? (
                  <div style={statusBadgeStyle(connection.status)}>
                    {connection.status === 'active' ? (
                      <><CheckCircle2 size={16} /> 提携中</>
                    ) : (
                      <><Send size={16} /> 承認待ちです</>
                    )}
                  </div>
                ) : (
                  <button onClick={() => sendRequest(s.id)} style={requestBtnStyle}>
                    この店舗に提携リクエストを送る <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredShops.length === 0 && (
          <div style={emptyStyle}>
            <AlertCircle size={40} color="#cbd5e1" />
            <p>該当する業者が見つかりませんでした。</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- スタイル定義 ---
const containerStyle = { maxWidth: '600px', margin: '0 auto', padding: '20px', background: '#f8fafc', minHeight: '100vh' };
const headerStyle = { marginBottom: '30px' };
const backBtnStyle = { background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px', padding: 0 };
const titleStyle = { fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' };
const subTitleStyle = { fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 };
const searchBoxStyle = { position: 'relative', marginBottom: '25px' };
const searchIconStyle = { position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' };
const searchInputStyle = { width: '100%', padding: '15px 15px 15px 45px', borderRadius: '15px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const shopCardStyle = { background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' };
const cardHeaderStyle = { display: 'flex', gap: '15px', marginBottom: '15px' };
const iconBoxStyle = { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const infoStyle = { flex: 1 };
const shopNameStyle = { margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' };
const typeTagStyle = { fontSize: '0.7rem', color: '#6366f1', fontWeight: 'bold', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px', display: 'inline-block' };
const contactAreaStyle = { background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' };
const contactItemStyle = { fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' };
const actionAreaStyle = { borderTop: '1px solid #f1f5f9', paddingTop: '15px' };
const requestBtnStyle = { width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const statusBadgeStyle = (status) => ({
  width: '100%', padding: '14px', borderRadius: '14px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  background: status === 'active' ? '#ecfdf5' : '#fff7ed',
  color: status === 'active' ? '#10b981' : '#f97316',
  border: `1px solid ${status === 'active' ? '#10b981' : '#f97316'}`
});
const emptyStyle = { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' };
const centerStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };

export default ShopSearch;
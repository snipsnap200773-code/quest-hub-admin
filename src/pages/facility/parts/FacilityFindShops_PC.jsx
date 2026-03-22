import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Search, MapPin, User, ExternalLink, Send, 
  CheckCircle2, Filter, Phone, Store, Globe 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FacilityFindShops_PC = ({ facilityId, isMobile }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [myConnections, setMyConnections] = useState([]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').not('business_name', 'is', null);
    const { data: conns } = await supabase.from('shop_facility_connections').select('shop_id, status').eq('facility_user_id', facilityId);
    setShops(profiles || []);
    setMyConnections(conns || []);
    setLoading(false);
  };

  const handleRequest = async (shopId) => {
    const confirmReq = window.confirm("この店舗に提携リクエストを送信しますか？");
    if (!confirmReq) return;

    const { error } = await supabase.from('shop_facility_connections').insert([
      { facility_user_id: facilityId, shop_id: shopId, status: 'pending', created_by_type: 'facility' }
    ]);

    if (!error) {
      alert("リクエストを送信しました！");
      fetchShops();
    }
  };

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.business_name.includes(searchTerm) || (shop.address || "").includes(searchTerm);
    const matchesType = filterType === 'all' || shop.business_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div style={{textAlign: 'center', padding: '100px', color: '#3d2b1f'}}>業者データを読み込み中...</div>;

  return (
    <div style={{ width: '100%' }}>
      {/* 検索・フィルタ */}
      <div style={filterBarStyle(isMobile)}>
        <div style={searchBoxStyle}>
          <Search size={20} style={searchIconStyle} />
          <input 
            placeholder="店舗名やエリアで検索" 
            style={searchInputStyle}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={typeFilterStyle}>
          <Filter size={18} color="#c5a059" />
          <select style={selectStyle} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">すべての業種</option>
            <option value="訪問美容">訪問美容・理容</option>
            <option value="訪問歯科">訪問歯科</option>
            <option value="訪問マッサージ">訪問マッサージ</option>
          </select>
        </div>
      </div>

      {/* 業者グリッド */}
      <div style={gridStyle(isMobile)}>
        {filteredShops.map(shop => {
          const conn = myConnections.find(c => c.shop_id === shop.id);
          const isPending = conn?.status === 'pending';
          const isActive = conn?.status === 'active';
          const themeColor = shop.theme_color || '#c5a059';

          return (
            <motion.div key={shop.id} whileHover={{ y: -5 }} style={shopCardStyle(themeColor)}>
              <div style={cardHeaderStyle}>
                <div style={iconBadgeStyle(themeColor)}><Store size={20} color="#fff" /></div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                   <span style={typeTagStyle(themeColor)}>{shop.business_type || '訪問サービス'}</span>
                   <h3 style={shopNameStyle}>{shop.business_name}</h3>
                </div>
              </div>

              {/* リッチな情報セクション */}
              <div style={richInfoBox}>
                <div style={infoRow}>
                  <User size={16} color={themeColor} />
                  <span style={infoLabel}>代表：<strong>{shop.owner_name || '未登録'}</strong></span>
                </div>

                <div style={{ ...infoRow, alignItems: 'flex-start' }}>
                  <MapPin size={16} color={themeColor} style={{ marginTop: '3px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={infoLabel}>{shop.address || '住所未登録'}</span>
                    {shop.address && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`} 
                        target="_blank" rel="noreferrer" style={googleMapsBtn}
                      >
                        Googleマップで場所を確認
                      </a>
                    )}
                  </div>
                </div>

                {shop.phone && (
                  <a href={`tel:${shop.phone}`} style={phoneLinkStyle(themeColor)}>
                    <Phone size={16} />
                    <span>{shop.phone} <span style={{fontSize:'10px', fontWeight:'normal'}}>(タップで電話)</span></span>
                  </a>
                )}

                {shop.official_url && (
                  <a href={shop.official_url} target="_blank" rel="noreferrer" style={siteLinkStyle(themeColor)}>
                    <Globe size={16} />
                    <span>公式サイトを表示 <ExternalLink size={12} /></span>
                  </a>
                )}
              </div>

              <div style={descriptionBox}>
                <p style={descriptionText}>{shop.description || 'ショップの紹介文がまだありません。'}</p>
              </div>

              <div style={cardFooterStyle}>
                {isActive ? (
                  <div style={statusBadgeStyle('#10b981')}><CheckCircle2 size={18} /> 提携済み</div>
                ) : isPending ? (
                  <div style={statusBadgeStyle('#f59e0b')}>申請中・返信待ち</div>
                ) : (
                  <button onClick={() => handleRequest(shop.id)} style={requestBtnStyle(themeColor)}>
                    この店舗に提携リクエストを送る <Send size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// --- スタイル ---
const filterBarStyle = (isMobile) => ({ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', marginBottom: '30px', background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' });
const searchBoxStyle = { flex: 1, position: 'relative' };
const searchIconStyle = { position: 'absolute', left: '15px', top: '15px', color: '#999' };
const searchInputStyle = { width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' };
const typeFilterStyle = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fcfaf7', padding: '5px 15px', borderRadius: '12px', border: '1px solid #eee' };
const selectStyle = { border: 'none', background: 'none', fontSize: '0.9rem', fontWeight: 'bold', color: '#3d2b1f', outline: 'none', cursor: 'pointer' };

const gridStyle = (isMobile) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' });

const shopCardStyle = (color) => ({
  background: '#fff', borderRadius: '24px', padding: '30px', border: '1px solid #eee', 
  boxShadow: '0 10px 25px rgba(0,0,0,0.03)', borderTop: `6px solid ${color}`,
  display: 'flex', flexDirection: 'column'
});

const cardHeaderStyle = { display: 'flex', alignItems: 'center', marginBottom: '20px' };
const iconBadgeStyle = (color) => ({ width: '45px', height: '45px', background: color, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const typeTagStyle = (color) => ({ fontSize: '0.7rem', color: color, background: `${color}15`, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' });
const shopNameStyle = { margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#3d2b1f' };

const richInfoBox = { background: '#f8fafc', padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', border: '1px solid #eef2ff' };
const infoRow = { display: 'flex', alignItems: 'center', gap: '12px' };
const infoLabel = { fontSize: '0.9rem', color: '#475569' };
const googleMapsBtn = { fontSize: '0.75rem', color: '#fff', background: '#4f46e5', padding: '4px 12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '6px' };
const phoneLinkStyle = (color) => ({ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#4f46e5', textDecoration: 'none', fontWeight: 'bold' });
const siteLinkStyle = (color) => ({ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#64748b', textDecoration: 'none', borderTop: '1px solid #e2e8f0', paddingTop: '10px' });

const descriptionBox = { flex: 1, marginBottom: '25px' };
const descriptionText = { fontSize: '0.95rem', color: '#7f8c8d', lineHeight: '1.6', margin: 0 };

const cardFooterStyle = { marginTop: 'auto' };
const requestBtnStyle = (color) => ({ 
  width: '100%', padding: '18px', borderRadius: '14px', border: 'none', 
  background: '#1e293b', color: '#c5a059', fontWeight: 'bold', fontSize: '1rem', 
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
});
const statusBadgeStyle = (color) => ({ 
  width: '100%', padding: '16px', borderRadius: '14px', border: `2px solid ${color}`, 
  color: color, fontWeight: 'bold', textAlign: 'center', background: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
});

export default FacilityFindShops_PC;
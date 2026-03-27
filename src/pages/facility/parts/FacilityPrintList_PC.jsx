import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { Printer, Building2, ChevronRight, Loader2, Square } from 'lucide-react';

const FacilityPrintList_PC = ({ facilityId }) => {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [members, setMembers] = useState([]);
  const [services, setServices] = useState([]);
  const [lastVisits, setLastVisits] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchPartners(); }, [facilityId]);

  const fetchPartners = async () => {
    const { data } = await supabase
      .from('shop_facility_connections')
      .select(`*, profiles (id, business_name, theme_color)`)
      .eq('facility_user_id', facilityId)
      .eq('status', 'active');
    setShops(data?.map(d => d.profiles) || []);
  };

  const handleSelectShop = async (shop) => {
    setLoading(true);
    setSelectedShop(shop);

    const [memRes, servRes, histRes] = await Promise.all([
      supabase.from('members')
        .select('*')
        .eq('facility_user_id', facilityId)
        .order('floor', { ascending: true })
        .order('room', { ascending: true }),
      supabase.from('services')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('show_on_print', true),
      supabase.from('visit_request_residents')
        .select('member_id, completed_at, visit_requests!inner(shop_id)')
        .eq('status', 'completed')
        .eq('visit_requests.shop_id', shop.id)
        .order('completed_at', { ascending: false })
    ]);

    setServices(servRes.data || []);
    setMembers(memRes.data || []);

    const visitMap = {};
    histRes.data?.forEach(h => {
      if (!visitMap[h.member_id]) {
        visitMap[h.member_id] = h.completed_at.split('T')[0].slice(5).replace('-', '/');
      }
    });
    setLastVisits(visitMap);
    setLoading(false);
  };

  const floorGroups = useMemo(() => {
    return members.reduce((acc, m) => {
      const f = m.floor || '不明';
      if (!acc[f]) acc[f] = [];
      acc[f].push(m);
      return acc;
    }, {});
  }, [members]);

  if (!selectedShop) {
    return (
      <div style={containerStyle}>
        <div style={headerArea}>
          <h2 style={titleStyle}><Printer size={24} /> 掲示用名簿の作成</h2>
        </div>
        <div style={shopGrid}>
          {shops.map(shop => (
            <button key={shop.id} onClick={() => handleSelectShop(shop)} style={shopCard}>
              <Building2 size={32} color={shop.theme_color} />
              <strong style={{marginTop:'10px'}}>{shop.business_name}</strong>
              <div style={selectBadge}>作成する ➔</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header className="no-print" style={headerArea}>
        <button onClick={() => setSelectedShop(null)} style={backBtn}>← 戻る</button>
        <button style={printBtn} onClick={() => window.print()}><Printer size={18} /> 印刷する</button>
      </header>

      <div id="print-area">
        {Object.entries(floorGroups).map(([floor, floorMembers]) => (
          <div key={floor} style={pageWrapper}>
            <div style={printHeader}>
              <div>
                <h1 style={printTitle}>{selectedShop.business_name} あつまれ綺麗にしたい人</h1>
                <p style={printDate}>訪問予定日：　月　日（　）</p>
              </div>
              <div style={floorBadge}>フロア：<span style={{fontSize:'24pt'}}>{floor}</span>F</div>
            </div>

            <table style={printTable}>
              <thead>
                <tr>
                  <th style={thStyleNo}>申込</th>
                  <th style={thStyleRoom}>部屋</th>
                  <th style={thStyleName}>お名前</th>
                  <th style={thStyleMenu}>希望メニュー</th>
                  <th style={thStyleLast}>前回</th>
                </tr>
              </thead>
              <tbody>
                {floorMembers.map(m => (
                  <tr key={m.id}>
                    <td style={tdCenter}><div style={printCheck}></div></td>
                    <td style={tdCenter}>{m.room}</td>
                    <td style={tdName}>{m.name} 様</td>
                    <td style={tdMenuArea}>
                      {/* 🚀 🆕 横並び (flexDirection: 'row') に修正 */}
                      <div style={menuGridRow}>
                        {services.map(s => (
                          <div key={s.id} style={menuCheckItem}>
                            <span style={menuBox}></span>
                            <span style={menuNameText}>{s.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={tdLast}>{lastVisits[m.id] || 'ー'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: portrait; margin: 10mm; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

// --- スタイル定義 ---
const containerStyle = { maxWidth: '900px', margin: '0 auto', padding: '20px' };
const headerArea = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: '900', color: '#3d2b1f' };
const descStyle = { fontSize: '0.85rem', color: '#64748b' };
const shopGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' };
const shopCard = { background: '#fff', border: '2px solid #eee', borderRadius: '20px', padding: '30px', cursor: 'pointer', textAlign:'center' };
const selectBadge = { marginTop: '15px', fontSize: '0.75rem', color: '#c5a059', fontWeight:'bold' };
const backBtn = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold' };
const printBtn = { display: 'flex', alignItems: 'center', gap: '10px', background: '#3d2b1f', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' };

const pageWrapper = { background: '#fff', padding: '10px', marginBottom: '50px', pageBreakAfter: 'always' };
const printHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '10px', marginBottom: '15px' };
const printTitle = { fontSize: '18pt', margin: 0, fontWeight: 'bold' };
const printDate = { fontSize: '12pt', margin: '5px 0 0' };
const floorBadge = { fontSize: '14pt', fontWeight: 'bold' };

const printTable = { width: '100%', borderCollapse: 'collapse', border: '2px solid #000' };
const thStyleBase = { border: '1px solid #000', padding: '8px 4px', background: '#f2f2f2', fontSize: '10pt', textAlign: 'center' };
const thStyleNo = { ...thStyleBase, width: '45px' };
const thStyleRoom = { ...thStyleBase, width: '60px' };
const thStyleName = { ...thStyleBase, width: '150px' };
const thStyleMenu = { ...thStyleBase };
const thStyleLast = { ...thStyleBase, width: '70px' };

const tdBase = { border: '1px solid #000', padding: '8px 10px', fontSize: '11pt', height: '40px' };
const tdCenter = { ...tdBase, textAlign: 'center' };
const tdName = { ...tdBase, fontWeight: 'bold', fontSize: '12pt' };

// 🚀 🆕 メニューエリア：横並び (flex-direction: row) に変更
const tdMenuArea = { ...tdBase, padding: '10px' };
const menuGridRow = { 
  display: 'flex', 
  flexDirection: 'row', 
  gap: '20px', 
  flexWrap: 'wrap', 
  alignItems: 'center' 
};

const menuCheckItem = { display: 'flex', alignItems: 'center', gap: '6px', color: '#000' };
const menuBox = { width: '16px', height: '16px', border: '1.5px solid #000', display: 'inline-block', flexShrink: 0 };
const menuNameText = { fontSize: '11pt', lineHeight: '1', fontWeight: '500', whiteSpace: 'nowrap' };

const tdLast = { ...tdBase, textAlign: 'center', fontSize: '10pt', color: '#000' };
const printCheck = { width: '25px', height: '25px', border: '1.5px solid #000', margin: '0 auto' };

export default FacilityPrintList_PC;
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Scissors, Calendar, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FacilityStatus_PC = ({ facilityId }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchVisits(); }, [facilityId]);

  const fetchVisits = async () => {
    setLoading(true);
    
    // 1. まず訪問予定（親ID含む）を取得
    const { data: visitsData, error: vError } = await supabase
      .from('visit_requests')
      .select(`
        id, scheduled_date, start_time, status, parent_id,
        profiles (business_name, theme_color)
      `)
      .eq('facility_user_id', facilityId)
      .neq('status', 'canceled')
      .order('scheduled_date', { ascending: false });

    if (vError) {
      console.error(vError);
      setLoading(false);
      return;
    }

    // 2. 表示されている全ての「親ID」と「自分のID」をリストアップして名簿を一括取得
    const allRelevantIds = visitsData.map(v => v.parent_id || v.id);
    
    const { data: allResidents, error: rError } = await supabase
      .from('visit_request_residents')
      // 🆕 completed_at を追加！
      .select('*, members(name, room, floor)') 
      .in('visit_request_id', allRelevantIds);

    if (!rError) {
      // 3. 各訪問データに、適切な名簿（自分用か親用か）を割り当てる
      const combinedData = visitsData.map(visit => {
        const targetId = visit.parent_id || visit.id;
        const residents = allResidents.filter(r => r.visit_request_id === targetId);
        return { ...visit, residents };
      });

      setVisits(combinedData);
      if (combinedData.length > 0) setExpandedId(combinedData[0].id);
    }
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px'}}>読み込み中...</div>;

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={titleStyle}><Activity size={24} /> 現在の訪問・進捗状況</h2>
        <p style={descStyle}>複数日にわたる訪問の場合、全日程で進捗を共有しています。</p>
      </header>
      
      {visits.length === 0 ? (
        <div style={emptyCard}>現在、確定した予約はありません。</div>
      ) : (
        <div style={listContainer}>
          {visits.map((visit) => {
            const residents = visit.residents || [];
            const doneCount = residents.filter(r => r.status === 'completed').length;
            const totalCount = residents.length;
            const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

            return (
              <div key={visit.id} style={visitCard(visit.id === expandedId)}>
                <div style={cardHeader} onClick={() => setExpandedId(visit.id === expandedId ? null : visit.id)}>
                  <div style={dateBox}>
                    <Calendar size={18} />
                    <strong>{visit.scheduled_date.replace(/-/g, '/')}</strong>
                    {visit.parent_id && <span style={childBadge}>継続分</span>}
                  </div>

                  <div style={progressArea}>
                    <div style={countBadge(progress === 100)}>
                      {doneCount} / {totalCount} 名 完了
                    </div>
                    {visit.id === expandedId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                <div style={progressBarBg}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={progressBar(visit.profiles?.theme_color || '#c5a059')} />
                </div>

                <AnimatePresence>
                  {visit.id === expandedId && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={residentGrid}>
                        {residents.map((res) => {
                          // 🆕 1. 完了日時のフォーマット（月/日 時:分）
                          const doneDate = res.completed_at 
                            ? new Date(res.completed_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : null;

                          return (
                            <div key={res.id} style={resRow(res.status)}>
                              <div style={resMain}>
                                <div style={statusIcon(res.status)}>
                                  {res.status === 'completed' ? <CheckCircle2 size={18} /> : res.status === 'cancelled' ? <XCircle size={18} /> : <Clock size={18} />}
                                </div>
                                <div>
                                  <div style={resName}>{res.members?.name} 様</div>
                                  <div style={resInfo}>{res.members?.room} | {res.menu_name}</div>
                                </div>
                              </div>
                              
                              {/* 🆕 2. 右側の表示エリア（ステータス ＆ 完了日時） */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={statusLabel(res.status)}>
                                  {res.status === 'completed' ? '完了' : res.status === 'pending' ? '待機中' : '中止'}
                                </div>
                                {res.status === 'completed' && doneDate && (
                                  <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 'bold', marginTop: '2px' }}>
                                    {doneDate}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- スタイル（追加・変更分のみ） ---
const childBadge = { fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', marginLeft: '10px', fontWeight: 'bold' };
const containerStyle = { maxWidth: '1000px', margin: '0 auto', padding: '20px' };
const headerStyle = { marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: '900', color: '#3d2b1f', margin: 0 };
const descStyle = { fontSize: '0.85rem', color: '#64748b', marginTop: '8px' };
const listContainer = { display: 'flex', flexDirection: 'column', gap: '15px' };
const visitCard = (active) => ({ background: '#fff', borderRadius: '20px', border: active ? '2px solid #3d2b1f' : '1px solid #eee', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' });
const cardHeader = { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const dateBox = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' };
const progressArea = { display: 'flex', alignItems: 'center', gap: '12px' };
const countBadge = (isDone) => ({ background: isDone ? '#10b981' : '#3d2b1f', color: '#fff', padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' });
const progressBarBg = { height: '6px', background: '#f1f5f9', width: '100%' };
const progressBar = (color) => ({ height: '100%', background: color });
const residentGrid = { padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', background: '#fcfaf7' };
const resRow = (status) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px', background: '#fff', border: `1px solid ${status === 'completed' ? '#10b981' : '#e2e8f0'}` });
const resMain = { display: 'flex', alignItems: 'center', gap: '12px' };
const statusIcon = (status) => ({ color: status === 'completed' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#cbd5e1' });
const resName = { fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' };
const resInfo = { fontSize: '0.75rem', color: '#64748b' };
const statusLabel = (status) => ({ fontSize: '0.7rem', fontWeight: '900', color: status === 'completed' ? '#059669' : '#94a3b8' });
const emptyCard = { textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '20px', color: '#94a3b8', border: '1px dashed #e2e8f0' };

export default FacilityStatus_PC;
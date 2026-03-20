import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Building2, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'; // 🆕 Userを追加
import { motion } from 'framer-motion';

const FacilityLogin = () => {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  
  // 🆕 変数名を facility から facilityMetadata に統一します
  const [facilityMetadata, setFacilityMetadata] = useState(null);
  const [loginId, setLoginId] = useState(''); // 🆕 追加
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchFacilityMetadata = async () => {
      if (!facilityId) { setLoading(false); return; }
      
      // 🆕 新しいテーブル facility_users から情報を取得
      const { data } = await supabase
        .from('facility_users')
        .select('facility_name, login_id')
        .eq('id', facilityId)
        .single();
      
      if (data) {
        setFacilityMetadata(data);
        setLoginId(data.login_id); // IDを自動入力
      }
      setLoading(false);
    };
    fetchFacilityMetadata();
  }, [facilityId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // 🆕 プラットフォーム共通ログインの照合
    const { data: user, error } = await supabase
      .from('facility_users')
      .select('id, facility_name')
      .eq('login_id', loginId)
      .eq('password', password)
      .single();

    if (user && !error) {
      sessionStorage.setItem('facility_user_id', user.id);
      sessionStorage.setItem(`facility_auth_active`, 'true');
      
      alert(`${user.facility_name} としてログインしました`);
      navigate(`/facility-portal/${user.id}/residents`);
    } else {
      alert('ログインIDまたはパスワードが正しくありません。');
      setIsProcessing(false);
    }
  };

  if (loading) return null;

  return (
    <div style={bgStyle}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={cardStyle}
      >
        <div style={iconBoxStyle}><Building2 size={32} /></div>
        
        {/* 🆕 修正ポイント：facility.name ではなく facilityMetadata?.facility_name を使う */}
        <h1 style={titleStyle}>{facilityMetadata?.facility_name || "施設ログイン"}</h1>
        <p style={subtitleStyle}>QUEST HUB 施設専用ポータル</p>

        <form onSubmit={handleLogin} style={formStyle}>
          {/* 🆕 ログインID入力欄 */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>施設ログインID</label>
            <div style={inputWrapperStyle}>
              <User size={18} style={inputIconStyle} />
              <input 
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                style={inputStyle}
                placeholder="ログインIDを入力"
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>パスワード</label>
            <div style={inputWrapperStyle}>
              <Lock size={18} style={inputIconStyle} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="パスワードを入力"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isProcessing}
            style={loginBtnStyle}
          >
            {isProcessing ? '認証中...' : (
              <>ログインして名簿を開く <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div style={footerStyle}>
          <ShieldCheck size={14} /> セキュア接続済み
        </div>
      </motion.div>
    </div>
  );
};

// スタイル定義は以前のままでOK
const bgStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '20px' };
const cardStyle = { background: '#fff', width: '100%', maxWidth: '400px', padding: '40px 30px', borderRadius: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center' };
const iconBoxStyle = { width: '64px', height: '64px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' };
const titleStyle = { fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 5px 0' };
const subtitleStyle = { fontSize: '0.85rem', color: '#64748b', marginBottom: '30px' };
const formStyle = { textAlign: 'left' };
const inputGroupStyle = { marginBottom: '25px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' };
const inputWrapperStyle = { position: 'relative', display: 'flex', alignItems: 'center' };
const inputIconStyle = { position: 'absolute', left: '12px', color: '#94a3b8' };
const inputStyle = { width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' };
const loginBtnStyle = { width: '100%', padding: '16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const footerStyle = { marginTop: '30px', fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' };
const centerStyle = { display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b' };

export default FacilityLogin;
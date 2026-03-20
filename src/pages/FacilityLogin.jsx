import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Building2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const FacilityLogin = () => {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const [facility, setFacility] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchFacility = async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('name, pw')
        .eq('id', facilityId)
        .single();
      
      if (data) setFacility(data);
      setLoading(false);
    };
    fetchFacility();
  }, [facilityId]);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (password === facility?.pw) {
      // 施設用の認証情報をセッションに保存
      sessionStorage.setItem(`facility_auth_${facilityId}`, 'true');
      // ログイン成功 -> 名簿入力画面へ
      navigate(`/facility-portal/${facilityId}/residents`);
    } else {
      alert('パスワードが正しくありません。');
      setIsProcessing(false);
    }
  };

  if (loading) return null;
  if (!facility) return <div style={centerStyle}>施設が見つかりません。URLを確認してください。</div>;

  return (
    <div style={bgStyle}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={cardStyle}
      >
        <div style={iconBoxStyle}><Building2 size={32} /></div>
        <h1 style={titleStyle}>{facility.name}</h1>
        <p style={subtitleStyle}>入居者名簿・訪問依頼ポータル</p>

        <form onSubmit={handleLogin} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>施設専用パスワード</label>
            <div style={inputWrapperStyle}>
              <Lock size={18} style={inputIconStyle} />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="パスワードを入力"
                autoFocus
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

// スタイル定義（清潔感のあるブルーグレー基調）
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
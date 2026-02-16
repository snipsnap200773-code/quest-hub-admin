import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "../../../supabaseClient";
import { 
  ClipboardList, ArrowLeft, Save, CheckCircle2, 
  MapPin, Car, Building2, HeartPulse, MessageSquare, 
  Eye, ToggleLeft, ToggleRight,
  User, Mail, Phone
} from 'lucide-react';

const FormCustomizer = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [themeColor, setThemeColor] = useState('#2563eb');
  
  // フォーム設定のState
  const [formConfig, setFormConfig] = useState({
    name: { enabled: true, label: "お名前", required: true },
    email: { enabled: true, label: "メールアドレス", required: true },
    phone: { enabled: true, label: "電話番号", required: true },
    address: { enabled: true, label: "訪問先の住所", required: true },
    parking: { enabled: true, label: "駐車スペースの有無", required: false },
    building_type: { enabled: false, label: "建物の種類", required: false },
    care_notes: { enabled: false, label: "お身体の状況", required: false },
    notes: { enabled: true, label: "備考欄", required: false }
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isPC = windowWidth > 900;

  useEffect(() => { if (shopId) fetchSettings(); }, [shopId]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('profiles').select('theme_color, form_config').eq('id', shopId).single();
    if (data) {
      setThemeColor(data.theme_color || '#2563eb');
      if (data.form_config) setFormConfig(data.form_config);
    }
  };

  const showMsg = (txt) => { setMessage(txt); setTimeout(() => setMessage(''), 3000); };

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
      form_config: formConfig
    }).eq('id', shopId);

    if (!error) showMsg('予約項目の設定を保存しました！');
    else alert('保存に失敗しました。');
  };

  const toggleField = (key) => {
    setFormConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const updateLabel = (key, newLabel) => {
    setFormConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], label: newLabel }
    }));
  };

  // --- スタイル定義 (GeneralSettingsと統一) ---
  const containerStyle = { fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '20px', paddingBottom: '120px' };
  const cardStyle = { marginBottom: '20px', background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' };
  
  const ConfigItem = ({ id, icon: Icon, title, description }) => (
    <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ padding: '10px', background: formConfig[id].enabled ? `${themeColor}15` : '#f1f5f9', borderRadius: '12px' }}>
            <Icon size={24} color={formConfig[id].enabled ? themeColor : '#94a3b8'} />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{description}</div>
          </div>
        </div>
        <button onClick={() => toggleField(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: formConfig[id].enabled ? themeColor : '#cbd5e1' }}>
          {formConfig[id].enabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
        </button>
      </div>
      
      {formConfig[id].enabled && (
        <div style={{ marginLeft: '46px', animation: 'fadeIn 0.3s ease' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: themeColor, display: 'block', marginBottom: '6px' }}>表示ラベル名（案内人のセリフなど）</label>
          <input 
            type="text" 
            value={formConfig[id].label} 
            onChange={(e) => updateLabel(id, e.target.value)} 
            style={inputStyle}
            placeholder="例：冒険の目的地（ご住所）"
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={containerStyle}>
      {message && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', padding: '15px', background: '#dcfce7', color: '#166534', borderRadius: '12px', zIndex: 1001, textAlign: 'center', fontWeight: 'bold' }}>
          <CheckCircle2 size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '30px' }}>
        <button onClick={() => navigate(`/admin/${shopId}/dashboard`)} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> {isPC ? 'ダッシュボードへ' : '戻る'}
        </button>
      </div>

      <h2 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ClipboardList size={28} /> 予約フォームのカスタマイズ
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
        お客様に入力してもらう項目を業種に合わせて調整できます。
      </p>

      {/* 📋 項目設定カード */}
      <section style={{ ...cardStyle, borderTop: `8px solid ${themeColor}` }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', color: themeColor, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Eye size={20} /> 表示項目の選択
        </h3>
        
        <ConfigItem 
          id="name" icon={User} title="お名前" 
          description="予約者を識別するための必須項目です。通常はオンを推奨します。" 
        />
        <ConfigItem 
          id="email" icon={Mail} title="メールアドレス" 
          description="予約完了通知やリマインドの送信先になります。" 
        />
        <ConfigItem 
          id="phone" icon={Phone} title="電話番号" 
          description="緊急時の連絡先として取得します。" 
        />
        <ConfigItem 
          id="address" icon={MapPin} title="訪問先住所" 
          description="訪問カットには必須の項目です。お客様の家へ伺うための住所を取得します。" 
        />
        <ConfigItem 
          id="parking" icon={Car} title="駐車スペース" 
          description="車で伺う場合、駐車場の有無を事前に確認できます。" 
        />
        <ConfigItem 
          id="building_type" icon={Building2} title="建物の種類" 
          description="マンション、戸建て、施設内など、訪問時の目印になります。" 
        />
        <ConfigItem 
          id="care_notes" icon={HeartPulse} title="お身体の状況・介助" 
          description="車椅子利用や、施術時に介助が必要かどうかを確認できます。" 
        />
        <ConfigItem 
          id="notes" icon={MessageSquare} title="自由備考欄" 
          description="その他、お客様から案内人へ伝えたいことを自由に入力できます。" 
        />
      </section>

      {/* 💾 保存ボタン */}
      <button onClick={handleSave} style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '18px 40px', background: themeColor, color: '#fff', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: `0 10px 25px ${themeColor}66`, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1.1rem' }}>
        <Save size={22} /> 設定を保存する
      </button>
    </div>
  );
};

export default FormCustomizer;
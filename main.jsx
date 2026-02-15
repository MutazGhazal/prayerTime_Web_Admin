import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import App from './App';
import '../styles.css';

const config = window.APP_CONFIG;
if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  document.getElementById('root').innerHTML =
    "<div class='auth-page'><div class='auth-card'><p>يرجى إنشاء ملف config.js</p></div></div>";
} else {
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App config={config} supabase={supabase} />);
}

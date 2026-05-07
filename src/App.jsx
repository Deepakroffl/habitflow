import { useState, useEffect, useMemo, createContext, useContext, lazy, Suspense } from 'react';
import { format, subDays, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday as isDateToday, addMonths, subMonths } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { CheckCircle2, XCircle, Flame, Target, TrendingUp, Clock, ChevronLeft, ChevronRight, Plus, MessageSquare, StickyNote, Edit3, Trash2, Calendar, LayoutDashboard, List, BarChart3, Trophy, Moon, Sun, LogOut, Menu, X, Zap, ChevronRight as ChevRight, User, Download, PieChart as PieChartIcon, Award } from 'lucide-react';
import { api } from './api';
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORIES, LEVEL_THRESHOLDS, ACHIEVEMENT_DEFS, COLORS_PALETTE, LEVEL_TITLES } from './constants';

/* ═══════════════════════════════
   Contexts
   ═══════════════════════════════ */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);
const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);
const DataCtx = createContext(null);
const useData = () => useContext(DataCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('hf_token');
    if (!t) { setReady(true); return; }
    api('/auth/me').then(d => { if (d.user) setUser(d.user); }).catch(() => localStorage.removeItem('hf_token')).finally(() => setReady(true));
  }, []);
  const login = async (email, password) => { try { const d = await api('/auth/login', { method:'POST', body:JSON.stringify({email,password}) }); localStorage.setItem('hf_token',d.token); setUser(d.user); return {ok:true}; } catch(e){ return {ok:false,error:e.message}; } };
  const register = async (username, email, password) => { try { const d = await api('/auth/register', { method:'POST', body:JSON.stringify({username,email,password}) }); localStorage.setItem('hf_token',d.token); setUser(d.user); return {ok:true}; } catch(e){ return {ok:false,error:e.message}; } };
  const logout = () => { localStorage.removeItem('hf_token'); setUser(null); };
  const refresh = async () => { try { const d = await api('/auth/me'); if(d.user) setUser(d.user); } catch(_){} };
  return <AuthCtx.Provider value={{user,ready,login,register,logout,refresh,loggedIn:!!user}}>{children}</AuthCtx.Provider>;
}

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('hf_theme')==='dark');
  useEffect(() => { document.documentElement.classList.toggle('dark',dark); localStorage.setItem('hf_theme',dark?'dark':'light'); }, [dark]);
  return <ThemeCtx.Provider value={{dark,toggle:()=>setDark(d=>!d)}}>{children}</ThemeCtx.Provider>;
}

function DataProvider({ children }) {
  const { loggedIn, refresh } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!loggedIn) { setHabits([]); setLogs([]); setStreaks([]); setLoading(false); return; }
    try {
      const [h, l, s] = await Promise.all([api('/habits'), api('/logs'), api('/analytics/streaks')]);
      setHabits(h.habits||[]); setLogs(l.logs||[]); setStreaks(s.streaks||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [loggedIn]);

  const createHabit = async (data) => { try { await api('/habits',{method:'POST',body:JSON.stringify(data)}); await load(); await refresh(); } catch(e){ alert(e.message); } };
  const updateHabit = async (id, data) => { try { await api(`/habits/${id}`,{method:'PUT',body:JSON.stringify(data)}); await load(); } catch(e){ alert(e.message); } };
  const deleteHabit = async (id) => { try { await api(`/habits/${id}`,{method:'DELETE'}); await load(); } catch(e){ alert(e.message); } };
  const logHabit = async (habitId, date, status, reason, notes) => { try { await api('/logs',{method:'POST',body:JSON.stringify({habitId,date,status,reason,notes})}); await load(); await refresh(); } catch(e){ alert(e.message); } };
  const getStreak = (hid) => streaks.find(s=>s.habitId===hid) || {habitId:hid,habitTitle:'',currentStreak:0,longestStreak:0,totalCompletions:0,category:'OTHER',color:'#6b7280'};

  return <DataCtx.Provider value={{habits,logs,streaks,loading,createHabit,updateHabit,deleteHabit,logHabit,getStreak,reload:load}}>{children}</DataCtx.Provider>;
}

/* ═══════════════════════════════
   Auth Page
   ═══════════════════════════════ */
function AuthPage() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({username:'',email:'',password:''});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const { dark, toggle } = useTheme();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.email||!form.password) { setError('Email and password required'); return; }
    if (form.password.length<6) { setError('Password must be at least 6 characters'); return; }
    if (tab==='register'&&!form.username.trim()) { setError('Username required'); return; }
    setBusy(true);
    try {
      const r = tab==='login' ? await login(form.email,form.password) : await register(form.username,form.email,form.password);
      if (!r.ok) setError(r.error);
    } catch(e) { setError('Cannot connect to server'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4 transition-colors duration-300">
      <button onClick={toggle} className="fixed top-4 right-4 p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg hover:scale-110 transition-all">
        {dark ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20} className="text-gray-600"/>}
      </button>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4"><Zap size={32} className="text-white"/></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">HabitFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Build better habits, one day at a time</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
            {['login','register'].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setError('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}>{t==='login'?'Sign In':'Sign Up'}</button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {tab==='register' && <input type="text" placeholder="Username" value={form.username} onChange={e=>set('username',e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>}
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e=>set('password',e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
            {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">{error}</div>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{busy?'Please wait…':tab==='login'?'Sign In':'Create Account'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   Layout
   ═══════════════════════════════ */
const NAV = [
  {id:'dashboard',label:'Dashboard',Icon:LayoutDashboard},
  {id:'habits',label:'Habits',Icon:List},
  {id:'analytics',label:'Analytics',Icon:BarChart3},
  {id:'calendar',label:'Calendar',Icon:Calendar},
  {id:'achievements',label:'Achievements',Icon:Trophy},
];

function Layout({children,page,setPage}) {
  const {user,logout} = useAuth();
  const {dark,toggle} = useTheme();
  const [open,setOpen] = useState(false);

  const handleExport = async (fmt) => {
    try { const d = await api(`/users/export?format=${fmt}`); const blob = new Blob([fmt==='csv'?d:JSON.stringify(d,null,2)],{type:fmt==='csv'?'text/csv':'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`habitflow.${fmt}`; a.click(); } catch(e){alert(e.message);}
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={()=>setOpen(false)}/>}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Zap size={20} className="text-white"/></div>
              <div><h1 className="font-bold text-gray-900 dark:text-white text-lg">HabitFlow</h1><p className="text-xs text-gray-400">Level {user?.level||1}</p></div>
            </div>
            <button onClick={()=>setOpen(false)} className="lg:hidden text-gray-400"><X size={20}/></button>
          </div>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>{user?.points||0} XP</span><span>Level {user?.level||1}</span></div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{width:`${Math.min(100,(user?.points||0)%100)}%`}}/></div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV.map(({id,label,Icon})=>(
              <button key={id} onClick={()=>{setPage(id);setOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${page===id?'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                <Icon size={20}/><span className="flex-1 text-left">{label}</span>{page===id&&<ChevRight size={16}/>}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 my-3 pt-3">
              <button onClick={()=>handleExport('json')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"><Download size={20}/><span className="flex-1 text-left">Export JSON</span></button>
              <button onClick={()=>handleExport('csv')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"><Download size={20}/><span className="flex-1 text-left">Export CSV</span></button>
            </div>
          </nav>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase()||<User size={18}/>}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.username}</p><p className="text-xs text-gray-400 truncate">{user?.email}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggle} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-all">{dark?<Sun size={16}/>:<Moon size={16}/>}</button>
              <button onClick={logout} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm transition-all"><LogOut size={16}/><span>Logout</span></button>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={()=>setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Menu size={20} className="text-gray-600 dark:text-gray-300"/></button>
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><Zap size={16} className="text-white"/></div><span className="font-bold text-gray-900 dark:text-white">HabitFlow</span></div>
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">{dark?<Sun size={18} className="text-yellow-400"/>:<Moon size={18} className="text-gray-600"/>}</button>
          </div>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   Dashboard Page
   ═══════════════════════════════ */
function DashboardPage({onNav}) {
  const {user} = useAuth();
  const {habits,logs,logHabit,getStreak} = useData();
  const [selDate, setSelDate] = useState(format(startOfDay(new Date()),'yyyy-MM-dd'));
  const [missModal, setMissModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);

  const dayLogs = useMemo(()=>logs.filter(l=>l.date&&l.date.startsWith(selDate)),[logs,selDate]);
  const stats = useMemo(()=>{const c=dayLogs.filter(l=>l.status==='COMPLETED').length; const m=dayLogs.filter(l=>l.status==='MISSED').length; return {c,m,p:habits.length-c-m,t:habits.length};},[dayLogs,habits]);
  const weekStats = useMemo(()=>{const d=[]; for(let i=6;i>=0;i--){const dt=format(subDays(new Date(),i),'yyyy-MM-dd'); const dl=logs.filter(l=>l.date&&l.date.startsWith(dt)); d.push({date:dt,completed:dl.filter(l=>l.status==='COMPLETED').length,total:habits.length,day:format(subDays(new Date(),i),'EEE')});} return d;},[logs,habits]);
  const bestStrk = useMemo(()=>{let b={currentStreak:0,habitTitle:''}; habits.forEach(h=>{const s=getStreak(h.id); if(s.currentStreak>b.currentStreak) b={currentStreak:s.currentStreak,habitTitle:s.habitTitle||h.title};}); return b;},[habits,getStreak]);
  const logFor = (hid) => dayLogs.find(l=>l.habit_id===hid);
  const navDate = (dir) => { const d=new Date(selDate); d.setDate(d.getDate()+dir); setSelDate(format(d,'yyyy-MM-dd')); };
  const isToday = selDate===format(startOfDay(new Date()),'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {user?.username} 👋</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Let's check your habits for today</p></div>
        {habits.length===0 && <button onClick={()=>onNav('habits')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"><Plus size={18}/>Create First Habit</button>}
      </div>
      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <button onClick={()=>navDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={20} className="text-gray-600 dark:text-gray-300"/></button>
        <div className="text-center min-w-[200px]"><p className="text-lg font-semibold text-gray-900 dark:text-white">{isToday?'Today':format(new Date(selDate+'T12:00:00'),'EEEE')}</p><p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(selDate+'T12:00:00'),'MMMM d, yyyy')}</p></div>
        <button onClick={()=>navDate(1)} disabled={isToday} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronRight size={20} className="text-gray-600 dark:text-gray-300"/></button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{icon:<CheckCircle2 size={20} className="text-emerald-500"/>,bg:'bg-emerald-50 dark:bg-emerald-500/10',label:'Completed',val:stats.c,sub:`of ${stats.t} habits`},{icon:<Clock size={20} className="text-amber-500"/>,bg:'bg-amber-50 dark:bg-amber-500/10',label:'Pending',val:stats.p,sub:'remaining today'},{icon:<Flame size={20} className="text-orange-500"/>,bg:'bg-orange-50 dark:bg-orange-500/10',label:'Best Streak',val:bestStrk.currentStreak,sub:bestStrk.habitTitle||'No streaks yet'},{icon:<Target size={20} className="text-purple-500"/>,bg:'bg-purple-50 dark:bg-purple-500/10',label:'Rate',val:`${stats.t>0?Math.round((stats.c/stats.t)*100):0}%`,sub:'completion rate'}].map((s,i)=>(
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div><span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span></div><p className="text-3xl font-bold text-gray-900 dark:text-white">{s.val}</p><p className="text-xs text-gray-400 mt-1 truncate">{s.sub}</p></div>
        ))}
      </div>
      {/* Weekly Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500"/>This Week</h3><button onClick={()=>onNav('analytics')} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">View more →</button></div>
        <div className="flex items-end gap-2 h-24">{weekStats.map((d,i)=>{const pct=d.total>0?(d.completed/d.total)*100:0; return(<div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{height:'72px'}}><div className="w-full rounded-lg transition-all duration-500" style={{height:`${pct}%`,marginTop:`${100-pct}%`,background:pct>=80?'#10b981':pct>=50?'#f59e0b':pct>0?'#ef4444':'#e5e7eb'}}/></div><span className={`text-xs font-medium ${d.date===selDate?'text-indigo-500':'text-gray-400'}`}>{d.day}</span></div>);})}</div>
      </div>
      {/* Habit List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Habits</h3>
        {habits.length===0 ? <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Target size={28} className="text-gray-400"/></div><h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No habits yet</h3><p className="text-gray-500 dark:text-gray-400 mb-4">Create your first habit to start tracking</p><button onClick={()=>onNav('habits')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium"><Plus size={18}/>Add Habit</button></div> : (
          <div className="space-y-3">{habits.map(h=>{const log=logFor(h.id); const isDone=log?.status==='COMPLETED'; const isMiss=log?.status==='MISSED'; const streak=getStreak(h.id);
            return (<div key={h.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border transition-all ${isDone?'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10':isMiss?'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10':'border-gray-100 dark:border-gray-700'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{backgroundColor:CATEGORY_COLORS[h.category]||'#6b7280'}}>{h.title.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><h4 className={`font-semibold ${isDone?'line-through text-gray-400':'text-gray-900 dark:text-white'}`}>{h.title}</h4>{streak.currentStreak>0&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-500 text-xs font-medium"><Flame size={12}/>{streak.currentStreak}</span>}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{h.description||CATEGORY_LABELS[h.category]||h.category}</p>
                  {isMiss&&log.reason&&<p className="text-xs text-red-500 mt-1 flex items-center gap-1"><MessageSquare size={12}/>{log.reason}</p>}
                  {log?.notes&&<p className="text-xs text-indigo-500 mt-1 flex items-center gap-1"><StickyNote size={12}/>{log.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log&&<button onClick={()=>setNoteModal({habitId:h.id,notes:log.notes||''})} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-500 transition-colors" title="Add note"><StickyNote size={18}/></button>}
                  {!log ? (<><button onClick={()=>logHabit(h.id,selDate,'completed')} className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"><CheckCircle2 size={22}/></button><button onClick={()=>setMissModal({habitId:h.id,reason:''})} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"><XCircle size={22}/></button></>) : (<div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDone?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400':'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>{isDone?'✅ Done':'❌ Missed'}</div>)}
                </div>
              </div>
            </div>);
          })}</div>
        )}
      </div>
      {/* Miss Modal */}
      {missModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setMissModal(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Why did you miss this habit?</h3><textarea value={missModal.reason} onChange={e=>setMissModal({...missModal,reason:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="What prevented you?" autoFocus/><div className="flex gap-3 mt-4"><button onClick={()=>setMissModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancel</button><button onClick={()=>{logHabit(missModal.habitId,selDate,'missed',missModal.reason||'No reason');setMissModal(null);}} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium">Mark as Missed</button></div></div></div>}
      {/* Note Modal */}
      {noteModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setNoteModal(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add a Note</h3><textarea value={noteModal.notes} onChange={e=>setNoteModal({...noteModal,notes:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="Add notes..." autoFocus/><div className="flex gap-3 mt-4"><button onClick={()=>setNoteModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancel</button><button onClick={()=>{const l=logFor(noteModal.habitId); if(l) logHabit(noteModal.habitId,selDate,l.status==='COMPLETED'?'completed':'missed',l.reason,noteModal.notes); setNoteModal(null);}} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-medium">Save Note</button></div></div></div>}
    </div>
  );
}

/* ═══════════════════════════════
   Habits Page
   ═══════════════════════════════ */
function HabitsPage() {
  const {habits,createHabit,updateHabit,deleteHabit,getStreak,logs} = useData();
  const [show,setShow]=useState(false); const [editH,setEditH]=useState(null); const [delId,setDelId]=useState(null);
  const [form,setForm]=useState({title:'',description:'',category:'HEALTH',frequency:'DAILY',color:'#3b82f6'});
  const [filter,setFilter]=useState('All');
  const filtered = filter==='All'?habits:habits.filter(h=>h.category===filter);

  const openEdit=(h)=>{setEditH(h);setForm({title:h.title,description:h.description||'',category:h.category,frequency:h.frequency,color:h.color});setShow(true);};
  const submit=async(e)=>{e.preventDefault();if(!form.title.trim())return; if(editH){await updateHabit(editH.id,form);}else{await createHabit(form);} setShow(false);setEditH(null);setForm({title:'',description:'',category:'HEALTH',frequency:'DAILY',color:'#3b82f6'});};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">My Habits</h1><p className="text-gray-500 dark:text-gray-400 mt-1">{habits.length} habits tracked</p></div><button onClick={()=>{setEditH(null);setForm({title:'',description:'',category:'HEALTH',frequency:'DAILY',color:'#3b82f6'});setShow(true);}} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"><Plus size={18}/>New Habit</button></div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"><button onClick={()=>setFilter('All')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter==='All'?'bg-indigo-500 text-white shadow-sm':'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>All ({habits.length})</button>{CATEGORIES.map(c=>{const cnt=habits.filter(h=>h.category===c).length; if(!cnt)return null; return <button key={c} onClick={()=>setFilter(c)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter===c?'text-white shadow-sm':'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`} style={filter===c?{backgroundColor:CATEGORY_COLORS[c]}:{}}>{CATEGORY_LABELS[c]} ({cnt})</button>;})}</div>
      {filtered.length===0 ? <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center"><Calendar size={28} className="text-gray-400 mx-auto mb-4"/><h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{habits.length===0?'No habits yet':'No habits in this category'}</h3></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(h=>{const s=getStreak(h.id); const hLogs=logs.filter(l=>l.habit_id===h.id); const comp=hLogs.filter(l=>l.status==='COMPLETED').length; const pct=hLogs.length>0?Math.round((comp/hLogs.length)*100):0;
          return (<div key={h.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"><div className="h-2" style={{backgroundColor:h.color||CATEGORY_COLORS[h.category]||'#6b7280'}}/><div className="p-5"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor:h.color||CATEGORY_COLORS[h.category]||'#6b7280'}}>{h.title.charAt(0)}</div><div><h3 className="font-semibold text-gray-900 dark:text-white">{h.title}</h3><span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium mt-1" style={{backgroundColor:(CATEGORY_COLORS[h.category]||'#6b7280')+'20',color:CATEGORY_COLORS[h.category]||'#6b7280'}}>{CATEGORY_LABELS[h.category]||h.category}</span></div></div><div className="flex gap-1"><button onClick={()=>openEdit(h)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Edit3 size={16}/></button><button onClick={()=>setDelId(h.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={16}/></button></div></div>{h.description&&<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{h.description}</p>}<div className="flex items-center justify-between text-sm"><div className="flex items-center gap-4"><div className="flex items-center gap-1.5 text-orange-500"><Flame size={16}/><span className="font-medium">{s.currentStreak}</span><span className="text-gray-400 text-xs">streak</span></div><div className="text-gray-400">Best: <span className="text-gray-600 dark:text-gray-300 font-medium">{s.longestStreak}</span></div></div><div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:h.color||CATEGORY_COLORS[h.category]||'#6b7280'}}/></div><span className="text-xs font-medium text-gray-500">{pct}%</span></div></div><div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400"><span className="capitalize">{(h.frequency||'daily').toLowerCase()}</span><span>{comp} completions</span></div></div></div>);
        })}</div>
      )}
      {/* Modal */}
      {show&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setShow(false)}><div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-gray-900 dark:text-white">{editH?'Edit Habit':'Create New Habit'}</h3><button onClick={()=>setShow(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} className="text-gray-400"/></button></div><form onSubmit={submit} className="space-y-5"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label><input type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g., Morning Meditation" required/></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="What does this habit involve?"/></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label><div className="grid grid-cols-4 gap-2">{CATEGORIES.map(c=>(<button key={c} type="button" onClick={()=>setForm({...form,category:c,color:CATEGORY_COLORS[c]})} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${form.category===c?'text-white shadow-sm scale-105':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`} style={form.category===c?{backgroundColor:CATEGORY_COLORS[c]}:{}}>{CATEGORY_LABELS[c]}</button>))}</div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frequency</label><div className="grid grid-cols-3 gap-2">{['DAILY','WEEKLY','CUSTOM'].map(f=>(<button key={f} type="button" onClick={()=>setForm({...form,frequency:f})} className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${form.frequency===f?'bg-indigo-500 text-white shadow-sm':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{f.toLowerCase()}</button>))}</div></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label><div className="flex gap-2">{COLORS_PALETTE.map(c=>(<button key={c} type="button" onClick={()=>setForm({...form,color:c})} className={`w-8 h-8 rounded-full transition-all ${form.color===c?'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110':''}`} style={{backgroundColor:c}}/>))}</div></div><div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancel</button><button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25">{editH?'Update':'Create'}</button></div></form></div></div>}
      {/* Delete Confirm */}
      {delId&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setDelId(null)}><div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}><div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500"/></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Delete Habit?</h3><p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">This will permanently delete this habit and all its logs.</p><div className="flex gap-3"><button onClick={()=>setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancel</button><button onClick={()=>{deleteHabit(delId);setDelId(null);}} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Delete</button></div></div></div>}
    </div>
  );
}

/* ═══════════════════════════════
   Analytics Page (with Recharts)
   ═══════════════════════════════ */
function AnalyticsPage() {
  const {habits,logs,streaks} = useData();
  const [range,setRange]=useState('30d');
  const [selH,setSelH]=useState('all');
  const days = range==='7d'?7:range==='30d'?30:range==='90d'?90:365;

  const daily = useMemo(()=>{const d=[]; for(let i=days-1;i>=0;i--){const dt=format(subDays(new Date(),i),'yyyy-MM-dd'); const dl=logs.filter(l=>{if(!l.date||!l.date.startsWith(dt))return false; if(selH!=='all')return l.habit_id===selH; return true;}); const c=dl.filter(l=>l.status==='COMPLETED').length; const t=selH==='all'?habits.length:1; d.push({date:format(subDays(new Date(),i),'MMM d'),rate:t>0?Math.round((c/t)*100):0});} return d;},[logs,habits,days,selH]);
  const monthly = useMemo(()=>{const d=[]; for(let i=11;i>=0;i--){const md=subMonths(new Date(),i); const ms=startOfMonth(md); const me=endOfMonth(md); const ds=eachDayOfInterval({start:ms,end:me}); let c=0,m=0; ds.forEach(day=>{const dt=format(day,'yyyy-MM-dd'); const dl=logs.filter(l=>{if(!l.date||!l.date.startsWith(dt))return false; if(selH!=='all')return l.habit_id===selH; return true;}); c+=dl.filter(l=>l.status==='COMPLETED').length; m+=dl.filter(l=>l.status==='MISSED').length;}); d.push({month:format(md,'MMM'),completed:c,missed:m});} return d;},[logs,selH,habits]);
  const pie = useMemo(()=>{const fl=selH==='all'?logs:logs.filter(l=>l.habit_id===selH); const c=fl.filter(l=>l.status==='COMPLETED').length; const m=fl.filter(l=>l.status==='MISSED').length; return [{name:'Completed',value:c,color:'#10b981'},{name:'Missed',value:m,color:'#ef4444'}].filter(d=>d.value>0);},[logs,selH]);
  const overall = useMemo(()=>{const t=logs.length; const c=logs.filter(l=>l.status==='COMPLETED').length; const bc=Math.max(0,...streaks.map(s=>s.currentStreak)); const be=Math.max(0,...streaks.map(s=>s.longestStreak)); return {t,c,rate:t>0?Math.round((c/t)*100):0,bc,be};},[logs,streaks]);
  const catData = useMemo(()=>{const a={}; habits.forEach(h=>{if(!a[h.category])a[h.category]={completed:0,missed:0}; const hl=logs.filter(l=>l.habit_id===h.id); a[h.category].completed+=hl.filter(l=>l.status==='COMPLETED').length; a[h.category].missed+=hl.filter(l=>l.status==='MISSED').length;}); return Object.entries(a).map(([c,d])=>({name:CATEGORY_LABELS[c]||c,completed:d.completed,missed:d.missed}));},[habits,logs]);

  const Tip = ({active,payload,label})=>{if(active&&payload&&payload.length){return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-sm"><p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>{payload.map((p,i)=>(<p key={i} style={{color:p.color}} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/>{p.name}: {p.value}</p>))}</div>;} return null;};

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Track your progress and patterns</p></div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">{['7d','30d','90d','1y'].map(r=>(<button key={r} onClick={()=>setRange(r)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${range===r?'bg-indigo-500 text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}>{r==='7d'?'7 Days':r==='30d'?'30 Days':r==='90d'?'90 Days':'1 Year'}</button>))}</div>
        <select value={selH} onChange={e=>setSelH(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"><option value="all">All Habits</option>{habits.map(h=>(<option key={h.id} value={h.id}>{h.title}</option>))}</select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{icon:<Target size={18} className="text-indigo-500"/>,l:'Completion Rate',v:`${overall.rate}%`},{icon:<Flame size={18} className="text-orange-500"/>,l:'Current Best Streak',v:overall.bc},{icon:<Award size={18} className="text-purple-500"/>,l:'Longest Streak Ever',v:overall.be},{icon:<Calendar size={18} className="text-emerald-500"/>,l:'Total Entries',v:overall.t}].map((s,i)=>(<div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-sm text-gray-500 dark:text-gray-400">{s.l}</span></div><p className="text-3xl font-bold text-gray-900 dark:text-white">{s.v}</p></div>))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-indigo-500"/><h3 className="font-semibold text-gray-900 dark:text-white">Completion Rate Over Time</h3></div><ResponsiveContainer width="100%" height={260}><AreaChart data={daily}><defs><linearGradient id="cr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="date" tick={{fontSize:11,fill:'#9ca3af'}} interval={Math.floor(daily.length/7)}/><YAxis tick={{fontSize:11,fill:'#9ca3af'}} domain={[0,100]}/><Tooltip content={<Tip/>}/><Area type="monotone" dataKey="rate" stroke="#6366f1" fill="url(#cr)" strokeWidth={2} name="Rate %"/></AreaChart></ResponsiveContainer></div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 mb-4"><BarChart3 size={18} className="text-emerald-500"/><h3 className="font-semibold text-gray-900 dark:text-white">Monthly Performance</h3></div><ResponsiveContainer width="100%" height={260}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis dataKey="month" tick={{fontSize:11,fill:'#9ca3af'}}/><YAxis tick={{fontSize:11,fill:'#9ca3af'}}/><Tooltip content={<Tip/>}/><Legend/><Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} name="Completed"/><Bar dataKey="missed" fill="#ef4444" radius={[4,4,0,0]} name="Missed"/></BarChart></ResponsiveContainer></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 mb-4"><PieChartIcon size={18} className="text-purple-500"/><h3 className="font-semibold text-gray-900 dark:text-white">Completed vs Missed</h3></div>{pie.length>0?<div className="flex items-center justify-center gap-8"><ResponsiveContainer width={200} height={200}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">{pie.map((e,i)=>(<Cell key={i} fill={e.color}/>))}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="space-y-3">{pie.map((d,i)=>(<div key={i} className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{backgroundColor:d.color}}/><div><p className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</p><p className="text-xs text-gray-400">{d.value} entries</p></div></div>))}</div></div>:<div className="h-[200px] flex items-center justify-center text-gray-400">No data yet</div>}</div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 mb-4"><BarChart3 size={18} className="text-amber-500"/><h3 className="font-semibold text-gray-900 dark:text-white">Category Breakdown</h3></div>{catData.length>0?<ResponsiveContainer width="100%" height={260}><BarChart data={catData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/><XAxis type="number" tick={{fontSize:11,fill:'#9ca3af'}}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#9ca3af'}} width={90}/><Tooltip content={<Tip/>}/><Bar dataKey="completed" fill="#10b981" radius={[0,4,4,0]} name="Completed"/><Bar dataKey="missed" fill="#ef4444" radius={[0,4,4,0]} name="Missed"/></BarChart></ResponsiveContainer>:<div className="h-[260px] flex items-center justify-center text-gray-400">No data yet</div>}</div>
      </div>
      {/* Streak Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Flame size={18} className="text-orange-500"/>Streak Leaderboard</h3>{streaks.length>0?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 dark:border-gray-700"><th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Habit</th><th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Category</th><th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Current</th><th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Longest</th><th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Completions</th></tr></thead><tbody>{[...streaks].sort((a,b)=>b.currentStreak-a.currentStreak).map(s=>(<tr key={s.habitId} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor:s.color||'#6b7280'}}>{(s.habitTitle||'?').charAt(0)}</div><span className="font-medium text-gray-900 dark:text-white">{s.habitTitle}</span></div></td><td className="py-3 px-4 text-center"><span className="inline-block px-2 py-1 rounded-md text-xs font-medium" style={{backgroundColor:(CATEGORY_COLORS[s.category]||'#6b7280')+'20',color:CATEGORY_COLORS[s.category]||'#6b7280'}}>{CATEGORY_LABELS[s.category]||s.category}</span></td><td className="py-3 px-4 text-center"><span className="inline-flex items-center gap-1 text-orange-500 font-semibold">{s.currentStreak>0&&<Flame size={14}/>}{s.currentStreak}</span></td><td className="py-3 px-4 text-center font-medium text-gray-700 dark:text-gray-300">{s.longestStreak}</td><td className="py-3 px-4 text-center font-medium text-gray-700 dark:text-gray-300">{s.totalCompletions}</td></tr>))}</tbody></table></div>:<p className="text-center text-gray-400 py-8">Create habits to see streak data</p>}</div>
    </div>
  );
}

/* ═══════════════════════════════
   Calendar Page
   ═══════════════════════════════ */
function CalendarPage() {
  const {habits,logs} = useData();
  const [month,setMonth]=useState(new Date()); const [sel,setSel]=useState(null); const [selH,setSelH]=useState('all');
  const ms=startOfMonth(month); const me=endOfMonth(month); const cs=startOfWeek(ms); const ce=endOfWeek(me); const cDays=eachDayOfInterval({start:cs,end:ce});

  const dayMap = useMemo(()=>{const m={}; cDays.forEach(d=>{const ds=format(d,'yyyy-MM-dd'); const dl=logs.filter(l=>{if(!l.date||!l.date.startsWith(ds))return false; if(selH!=='all')return l.habit_id===selH; return true;}); m[ds]={completed:dl.filter(l=>l.status==='COMPLETED').length,missed:dl.filter(l=>l.status==='MISSED').length,total:dl.length};}); return m;},[cDays,logs,selH]);
  const selLogs = useMemo(()=>{if(!sel)return []; return logs.filter(l=>{if(!l.date||!l.date.startsWith(sel))return false; if(selH!=='all')return l.habit_id===selH; return true;});},[sel,logs,selH]);
  const dayColor=(ds)=>{const s=dayMap[ds]; if(!s||!s.total)return ''; const r=s.completed/(s.completed+s.missed); if(r>=0.8)return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'; if(r>=0.5)return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'; if(r>0)return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'; return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Visual overview of your habit completion</p></div><select value={selH} onChange={e=>setSelH(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"><option value="all">All Habits</option>{habits.map(h=>(<option key={h.id} value={h.id}>{h.title}</option>))}</select></div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-6"><button onClick={()=>setMonth(subMonths(month,1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={20} className="text-gray-600 dark:text-gray-300"/></button><h2 className="text-xl font-bold text-gray-900 dark:text-white">{format(month,'MMMM yyyy')}</h2><button onClick={()=>setMonth(addMonths(month,1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={20} className="text-gray-600 dark:text-gray-300"/></button></div>
        <div className="grid grid-cols-7 gap-1 mb-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(<div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>))}</div>
        <div className="grid grid-cols-7 gap-1">{cDays.map(day=>{const ds=format(day,'yyyy-MM-dd'); const inM=isSameMonth(day,month); const td=isDateToday(day); const isSel=sel===ds; const st=dayMap[ds]; const dc=dayColor(ds);
          return (<button key={ds} onClick={()=>setSel(isSel?null:ds)} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative ${!inM?'opacity-30':''} ${dc||'hover:bg-gray-50 dark:hover:bg-gray-700'} ${isSel?'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800':''} ${td?'font-bold':''}`}><span className={td?'text-indigo-600 dark:text-indigo-400':'text-gray-700 dark:text-gray-300'}>{format(day,'d')}</span>{st&&st.total>0&&<div className="flex gap-0.5 mt-0.5">{st.completed>0&&<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}{st.missed>0&&<div className="w-1.5 h-1.5 rounded-full bg-red-500"/>}</div>}</button>);
        })}</div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"><div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 rounded-full bg-emerald-500"/>Great (80%+)</div><div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 rounded-full bg-amber-500"/>Good (50%+)</div><div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 rounded-full bg-red-500"/>Needs Work</div></div>
      </div>
      {sel&&<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5"><h3 className="font-semibold text-gray-900 dark:text-white mb-4">{format(new Date(sel+'T12:00:00'),'EEEE, MMMM d, yyyy')}</h3>{selLogs.length===0?<p className="text-gray-400 text-sm py-4 text-center">No entries for this day</p>:<div className="space-y-3">{selLogs.map((l,i)=>{const h=habits.find(x=>x.id===l.habit_id); if(!h)return null; return(<div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${l.status==='COMPLETED'?'bg-emerald-50 dark:bg-emerald-500/10':'bg-red-50 dark:bg-red-500/10'}`}><div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{backgroundColor:CATEGORY_COLORS[h.category]||'#6b7280'}}>{h.title.charAt(0)}</div><div className="flex-1"><p className="font-medium text-gray-900 dark:text-white">{h.title}</p>{l.reason&&<p className="text-xs text-red-500 mt-0.5">Reason: {l.reason}</p>}{l.notes&&<p className="text-xs text-indigo-500 mt-0.5">Note: {l.notes}</p>}</div>{l.status==='COMPLETED'?<CheckCircle2 size={22} className="text-emerald-500 shrink-0"/>:<XCircle size={22} className="text-red-500 shrink-0"/>}</div>);})}</div>}</div>}
    </div>
  );
}

/* ═══════════════════════════════
   Achievements Page
   ═══════════════════════════════ */
function AchievementsPage() {
  const {user} = useAuth();
  const {habits,logs,streaks} = useData();
  const [achievements,setAchievements]=useState([]);
  useEffect(()=>{api('/users/achievements').then(d=>setAchievements(d.achievements||[])).catch(()=>setAchievements(ACHIEVEMENT_DEFS.map(d=>({...d,unlocked:false,unlockedAt:null}))));},[]);

  const pts=user?.points||0; const lvl=user?.level||1;
  const next=LEVEL_THRESHOLDS[lvl]||LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length-1]; const prev=LEVEL_THRESHOLDS[lvl-1]||0;
  const prog=next>prev?((pts-prev)/(next-prev))*100:100;
  const unlocked=achievements.filter(a=>a.unlocked).length;
  const stats=useMemo(()=>{const tc=logs.filter(l=>l.status==='COMPLETED').length; let bs=0; streaks.forEach(s=>{bs=Math.max(bs,s.longestStreak);}); return {tc,bs,th:habits.length};},[habits,logs,streaks]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Achievements & Gamification</h1><p className="text-gray-500 dark:text-gray-400 mt-1">Level up by building consistent habits</p></div>
      {/* Level Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/30">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold">{lvl}</div><div><h2 className="text-2xl font-bold">Level {lvl}</h2><p className="text-indigo-200">{LEVEL_TITLES[Math.min(lvl-1,LEVEL_TITLES.length-1)]}</p></div></div><div className="text-right"><div className="flex items-center gap-1"><Zap size={18} className="text-yellow-300"/><span className="text-2xl font-bold">{pts}</span></div><p className="text-sm text-indigo-200">Total XP</p></div></div>
        <div className="space-y-2"><div className="flex justify-between text-sm text-indigo-200"><span>{pts-prev} / {next-prev} XP to next level</span><span>Level {lvl+1}</span></div><div className="w-full h-3 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-500" style={{width:`${Math.min(100,prog)}%`}}/></div></div>
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/20">{[{v:stats.th,l:'Habits'},{v:stats.tc,l:'Completed'},{v:stats.bs,l:'Best Streak'},{v:unlocked,l:'Badges'}].map((s,i)=>(<div key={i} className="text-center"><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-indigo-200">{s.l}</p></div>))}</div>
      </div>
      {/* Points Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Award size={18} className="text-amber-500"/>How to Earn Points</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{icon:<Target size={18} className="text-emerald-500"/>,bg:'bg-emerald-50 dark:bg-emerald-500/10',t:'Complete Habit',s:'+5 XP per completion'},{icon:<Zap size={18} className="text-indigo-500"/>,bg:'bg-indigo-50 dark:bg-indigo-500/10',t:'Create Habit',s:'+10 XP per habit'},{icon:<Flame size={18} className="text-orange-500"/>,bg:'bg-orange-50 dark:bg-orange-500/10',t:'Build Streaks',s:'Unlock streak badges'}].map((s,i)=>(<div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"><div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>{s.icon}</div><div><p className="text-sm font-medium text-gray-900 dark:text-white">{s.t}</p><p className="text-xs text-gray-400">{s.s}</p></div></div>))}</div></div>
      {/* Badges */}
      <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Trophy size={20} className="text-amber-500"/>Badges ({unlocked}/{achievements.length})</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{achievements.map(a=>(<div key={a.id||a.achievement_id} className={`relative rounded-2xl p-5 border transition-all ${a.unlocked?'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-700 shadow-sm':'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'}`}>{a.unlocked&&<div className="absolute top-3 right-3 w-6 h-6 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center"><Award size={14} className="text-amber-500"/></div>}<div className="text-4xl mb-3">{a.unlocked?a.icon:'🔒'}</div><h4 className="font-semibold text-gray-900 dark:text-white">{a.title}</h4><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>{a.unlocked&&a.unlockedAt&&<p className="text-xs text-amber-500 mt-2">Unlocked {format(new Date(a.unlockedAt),'MMM d, yyyy')}</p>}</div>))}</div></div>
    </div>
  );
}

/* ═══════════════════════════════
   App Root
   ═══════════════════════════════ */
export default function App() {
  return <ThemeProvider><AuthProvider><Root/></AuthProvider></ThemeProvider>;
}

function Root() {
  const { loggedIn, ready } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="text-center"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"/><p className="text-gray-500 dark:text-gray-400">Loading HabitFlow…</p></div></div>;
  if (!loggedIn) return <AuthPage/>;
  return <DataProvider><MainApp/></DataProvider>;
}

function MainApp() {
  const [page, setPage] = useState('dashboard');
  return (
    <Layout page={page} setPage={setPage}>
      {page==='dashboard' && <DashboardPage onNav={setPage}/>}
      {page==='habits' && <HabitsPage/>}
      {page==='analytics' && <AnalyticsPage/>}
      {page==='calendar' && <CalendarPage/>}
      {page==='achievements' && <AchievementsPage/>}
    </Layout>
  );
}

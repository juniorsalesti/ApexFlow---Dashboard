import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Card } from './ui/Card';
import { motion } from 'motion/react';
import { LogIn, UserPlus, LogOut, Mail, Lock, Chrome } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio não está autorizado no Firebase Console. Adicione o domínio do Vercel aos domínios autorizados.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O popup foi bloqueado pelo navegador. Por favor, permita popups para este site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore if user closed the popup
      } else {
        setError(`Erro ao entrar com Google: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <img 
              src="https://i.ibb.co/Y788pF9M/Apex-Flow.png" 
              alt="ApexFlow Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ApexFlow</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestão inteligente para sua agência</p>
        </div>

        <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <button 
              type="submit"
              className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500 font-medium transition-colors">Ou continue com</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Chrome className="w-4 h-4" />
            Google
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-violet-600 dark:text-violet-400 font-bold hover:underline"
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}

export function LogoutButton() {
  return (
    <button 
      onClick={() => signOut(auth)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-rose-900/20 text-rose-400 transition-colors"
    >
      <LogOut className="w-5 h-5" />
      <span className="text-sm font-medium">Sair</span>
    </button>
  );
}

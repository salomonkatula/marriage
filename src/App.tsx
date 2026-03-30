/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import Dashboard from './components/Dashboard';
import GuestList from './components/GuestList';
import RSVP from './components/RSVP';
import Scanner from './components/Scanner';
import GuestImportExport from './components/GuestImportExport';
import { LayoutDashboard, Users, QrCode, Upload, LogIn, LogOut, Heart, Menu, X, Mail, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type View = 'dashboard' | 'guests' | 'rsvp' | 'scanner' | 'import';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    setShowBootstrap(false);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login failed:', error);
      setLoginError('Identifiants invalides. Veuillez réessayer.');
      // If it's the admin email, show bootstrap option in case the user hasn't been created yet
      if (email === 'admin@wedding.com') {
        setShowBootstrap(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBootstrapAdmin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await createUserWithEmailAndPassword(auth, 'admin@wedding.com', 'wedding-admin-2026');
      alert('Compte admin initialisé avec succès !');
    } catch (error: any) {
      console.error('Bootstrap failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Le compte existe déjà. Vérifiez le mot de passe.');
      } else {
        setLoginError('Erreur lors de l\'initialisation. Vérifiez la console.');
      }
    } finally {
      setIsLoggingIn(false);
      setShowBootstrap(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('rsvp');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-image">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-accent"></div>
      </div>
    );
  }

  // Public RSVP view if not logged in
  if (!user && view !== 'rsvp') {
    return (
      <div className="min-h-screen bg-wedding-image flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-block p-4 bg-primary-50 rounded-full mb-4 relative">
              <Heart className="w-10 h-10 text-wedding-accent fill-wedding-accent animate-pulse" />
              <div className="absolute -top-1 -right-1">
                <Heart className="w-4 h-4 text-wedding-accent fill-wedding-accent opacity-50" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 serif tracking-tight">Notre Mariage</h1>
            <p className="text-gray-500 mt-2 font-serif italic text-xl">Système de présence des invités</p>
          </div>
          
          <div className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-wedding-accent/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Heart className="w-24 h-24 text-wedding-accent" />
            </div>
            <div className="relative z-10 space-y-4">
              <button 
                onClick={() => setView('rsvp')}
                className="w-full py-4 bg-wedding-accent text-white rounded-2xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20 flex items-center justify-center gap-2"
              >
                Aller au portail RSVP
              </button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-wedding-accent/10"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white/0 text-black uppercase tracking-widest text-[10px] font-bold">Accès Admin</span></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wedding-accent/50" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-wedding-accent/20 rounded-xl focus:ring-2 focus:ring-wedding-accent/20 focus:border-wedding-accent outline-none transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wedding-accent/50" />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-wedding-accent/20 rounded-xl focus:ring-2 focus:ring-wedding-accent/20 focus:border-wedding-accent outline-none transition-all"
                    required
                  />
                </div>
                {loginError && (
                  <div className="space-y-2">
                    <p className="text-red-500 text-xs font-medium px-1">{loginError}</p>
                    {showBootstrap && (
                      <button
                        type="button"
                        onClick={handleBootstrapAdmin}
                        className="w-full py-2 bg-wedding-accent/10 text-wedding-accent text-[10px] font-bold rounded-lg border border-wedding-accent/20 flex items-center justify-center gap-2 hover:bg-wedding-accent/20 transition-all"
                      >
                        <Sparkles className="w-3 h-3" />
                        INITIALISER LE COMPTE ADMIN
                      </button>
                    )}
                  </div>
                )}
                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-wedding-accent/5"></div></div>
                <div className="relative flex justify-center text-[10px]"><span className="px-2 bg-white/0 text-gray-400">OU</span></div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-wedding-accent" />
                Google Login
              </button>
            </div>
          </div>
          <p className="text-center text-black text-[10px] mt-8 font-serif italic">
            Copyright @2026, Design by Salomon Katula All Rights Reserved
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'guests', label: 'Liste des invités', icon: Users },
    { id: 'scanner', label: 'Enregistrement', icon: QrCode },
    { id: 'import', label: 'Import/Export', icon: Upload },
    { id: 'rsvp', label: 'Portail RSVP', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-wedding-image flex flex-col md:flex-row">
      {/* Sidebar / Mobile Nav */}
      <aside className={cn(
        "bg-white/70 backdrop-blur-lg border-r border-primary-100 transition-all duration-300 z-40",
        "fixed inset-y-0 left-0 w-64 md:relative md:translate-x-0",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-wedding-accent rounded-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 serif tracking-tight">App Mariage</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id as View); setIsMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  view === item.id 
                    ? "bg-wedding-accent text-white shadow-lg shadow-wedding-accent/20" 
                    : "text-gray-500 hover:bg-primary-50/50 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4 px-2">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-primary-100"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </button>
            <div className="mt-6 px-4">
              <p className="text-[10px] text-black font-serif italic leading-tight">
                Copyright @2026, Design by Salomon Katula<br />All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/40 backdrop-blur-md border-b border-primary-100 p-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-500 hover:bg-primary-50 rounded-lg"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h2 className="text-2xl font-bold text-gray-900 serif">
            {navItems.find(i => i.id === view)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <span className="hidden md:block text-sm text-black font-serif italic">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <Dashboard onNavigate={(v) => setView(v as View)} />}
              {view === 'guests' && <GuestList />}
              {view === 'rsvp' && <RSVP />}
              {view === 'scanner' && <Scanner />}
              {view === 'import' && <GuestImportExport />}
            </motion.div>
          </AnimatePresence>
          <footer className="mt-12 pt-8 border-t border-wedding-accent/10 text-center">
            <p className="text-[10px] text-black font-serif italic">
              Copyright @2026, Design by Salomon Katula All Rights Reserved
            </p>
          </footer>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

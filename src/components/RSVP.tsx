import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, GuestStatus, OperationType } from '../types';
import { handleFirestoreError, cn } from '../lib/utils';
import { Search, CheckCircle, XCircle, Users, Clock, ArrowRight, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function RSVP() {
  const [guestId, setGuestId] = useState('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (showScanner) {
      scannerRef.current = new Html5QrcodeScanner(
        "rsvp-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const onScanSuccess = (decodedText: string) => {
    setGuestId(decodedText.trim().toUpperCase());
    setShowScanner(false);
    // Trigger search automatically after scan
    performSearch(decodedText.trim());
  };

  const onScanFailure = () => {
    // Ignore scan failures
  };

  const performSearch = async (idToSearch: string) => {
    setLoading(true);
    setError(null);
    try {
      const trimmedId = idToSearch.trim();
      
      // 1. Try searching by custom 'id' field (G-XXXXXX) - case-insensitive
      const q = query(collection(db, 'guests'), where('id', '==', trimmedId.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as Guest;
        setGuest({ ...docData, id: snapshot.docs[0].id });
        return;
      }

      // 2. Try searching by Firestore Document ID directly - case-sensitive
      const guestDoc = await getDoc(doc(db, 'guests', trimmedId));
      
      if (guestDoc.exists()) {
        const docData = guestDoc.data() as Guest;
        setGuest({ ...docData, id: guestDoc.id });
      } else {
        setError('ID de l\'invité non trouvé. Veuillez vérifier votre invitation.');
      }
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      const id = idParam;
      setGuestId(id.toUpperCase());
      performSearch(id);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId.trim()) return;
    performSearch(guestId);
  };

  const handleRSVP = async (status: 'confirmed' | 'not_attending', plusOnes: number, arrivalTime: string) => {
    if (!guest) return;

    setLoading(true);
    try {
      const guestRef = doc(db, 'guests', guest.id);
      await updateDoc(guestRef, {
        status,
        plusOnes,
        arrivalTime,
        lastUpdated: new Date().toISOString()
      });
      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/${guest.id}`);
      setError('Échec de l\'enregistrement du RSVP. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl text-center border border-gray-100"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">RSVP Confirmé !</h2>
        <p className="text-gray-500 mb-8">
          Merci d'avoir confirmé votre présence. Nous avons hâte de vous voir !
        </p>
        <button 
          onClick={() => { setSuccess(false); setGuest(null); setGuestId(''); }}
          className="w-full py-4 bg-wedding-accent text-white rounded-2xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20"
        >
          Retour à l'accueil
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {!guest ? (
          <motion.div 
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-wedding-accent/10"
          >
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">RSVP de Mariage</h2>
            <p className="text-gray-500 mb-8">Veuillez entrer l'ID unique de votre invitation ou scanner votre code QR pour confirmer votre présence.</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => setShowScanner(!showScanner)}
                className={cn(
                  "w-full py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2",
                  showScanner ? "bg-red-50 text-red-600 border border-red-100" : "bg-primary-50 text-wedding-accent border border-wedding-accent/20"
                )}
              >
                {showScanner ? <X className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                {showScanner ? 'Fermer le scanner' : 'Scanner mon code QR'}
              </button>

              <AnimatePresence>
                {showScanner && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div id="rsvp-reader" className="rounded-2xl overflow-hidden border border-gray-100" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest text-black"><span className="px-2 bg-white">OU</span></div>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
                  <input 
                    type="text"
                    placeholder="Entrez l'ID de l'invité (ex: G-ABC123)"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-wedding-accent outline-none transition-all uppercase"
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-red-500 text-sm px-2">{error}</p>}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-wedding-accent text-white rounded-2xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Trouver mon invitation'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-wedding-accent/10"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Bonjour, {guest.name} !</h2>
              <p className="text-gray-500">Nous sommes honorés de célébrer notre union dans un cadre familial, dans le respect des traditions et dans l'amour.
Si vous souhaitez offrir un cadeau, nous vous invitons à faire un don financier qui sera transformé en œuvre sociale et reversé en totalité à une organisation pour personnes nécessiteuses basée au quartier Njinka (dans la ville de Foumban). Ceci nous tient particulièrement à cœur car il sera signe de gratitude et pour rendre à la communauté ce qu'elle nous a donné. Tout don peut être fait a ce contact Orange Money  699104589 Regine Charre Lindou. Merci.
</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const status = formData.get('status') as 'confirmed' | 'not_attending';
              const plusOnes = parseInt(formData.get('plusOnes') as string) || 0;
              const arrivalTime = formData.get('arrivalTime') as string;
              handleRSVP(status, plusOnes, arrivalTime);
            }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <label className="relative cursor-pointer group">
                  <input type="radio" name="status" value="confirmed" className="peer sr-only" defaultChecked />
                  <div className="p-4 rounded-2xl border-2 border-gray-100 text-center transition-all peer-checked:border-wedding-accent peer-checked:bg-primary-50 group-hover:bg-gray-50">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2 text-black peer-checked:text-wedding-accent" />
                    <span className="text-sm font-semibold text-gray-700">Présent</span>
                  </div>
                </label>
                <label className="relative cursor-pointer group">
                  <input type="radio" name="status" value="not_attending" className="peer sr-only" />
                  <div className="p-4 rounded-2xl border-2 border-gray-100 text-center transition-all peer-checked:border-red-600 peer-checked:bg-red-50 group-hover:bg-gray-50">
                    <XCircle className="w-6 h-6 mx-auto mb-2 text-black peer-checked:text-red-600" />
                    <span className="text-sm font-semibold text-gray-700">Absent</span>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4" />
                    Nombre d'accompagnateurs
                  </label>
                  <input 
                    type="number"
                    name="plusOnes"
                    min="0"
                    max="5"
                    defaultValue={guest.plusOnes || 0}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-wedding-accent outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4" />
                    Heure d'arrivée prévue
                  </label>
                  <input 
                    type="time"
                    name="arrivalTime"
                    defaultValue={guest.arrivalTime || "14:00"}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-wedding-accent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setGuest(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-4 bg-wedding-accent text-white rounded-2xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20 flex items-center justify-center"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmer le RSVP'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-center text-black text-[10px] mt-8 font-serif italic">
        Copyright @2026, Design by Salomon Katula All Rights Reserved
      </p>
    </div>
  );
}

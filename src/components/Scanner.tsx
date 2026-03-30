import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, OperationType } from '../types';
import { handleFirestoreError, cn } from '../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle, UserCheck, Clock, User, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Scanner() {
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const processCheckIn = async (id: string) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const q = query(collection(db, 'guests'), where('id', '==', id.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('ID invalide. Invité non trouvé.');
      } else {
        const guestDoc = snapshot.docs[0];
        const guestData = guestDoc.data() as Guest;

        if (guestData.status === 'arrived') {
          setError(`${guestData.name} s'est déjà enregistré.`);
          setScanResult({ ...guestData, id: guestDoc.id });
        } else {
          // Mark as arrived
          const guestRef = doc(db, 'guests', guestDoc.id);
          const checkInTime = new Date().toISOString();
          await updateDoc(guestRef, {
            status: 'arrived',
            checkInTime,
            lastUpdated: checkInTime
          });
          setScanResult({ ...guestData, id: guestDoc.id, status: 'arrived', checkInTime });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'guests');
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render((decodedText) => processCheckIn(decodedText), onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      }
    };
  }, []);

  const onScanFailure = (error: any) => {
    // Silently ignore scan failures (common when no QR is in view)
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    processCheckIn(manualId);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white/40 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-wedding-accent/10 overflow-hidden">
        <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-wedding-accent" />
          Enregistrement des invités
        </h2>
        <div id="reader" className="rounded-2xl overflow-hidden border-0" />
        <p className="text-center text-sm text-black mt-4">
          Pointez votre caméra vers le code QR de l'invité pour l'enregistrer.
        </p>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest text-black"><span className="px-2 bg-white/40 backdrop-blur-lg">OU</span></div>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
            <input 
              type="text"
              placeholder="Entrez l'ID de l'invité (ex: G-ABC123)"
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-wedding-accent outline-none transition-all uppercase bg-white/50"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading || !manualId.trim()}
            className="w-full py-4 bg-wedding-accent text-white rounded-2xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enregistrer manuellement'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {(scanResult || error) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "p-6 rounded-3xl shadow-xl border flex flex-col items-center text-center",
              error ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
            )}
          >
            {error ? (
              <XCircle className="w-12 h-12 text-red-500 mb-4" />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            )}
            
            <h3 className={cn(
              "text-xl font-bold mb-2",
              error ? "text-red-900" : "text-green-900"
            )}>
              {error ? "Échec de l'enregistrement" : "Enregistrement réussi !"}
            </h3>

            {scanResult && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-black">
                  <User className="w-4 h-4" />
                  <span className="font-semibold">{scanResult.name}</span>
                </div>
                {scanResult.checkInTime && (
                  <div className="flex items-center justify-center gap-2 text-black text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Arrivé à {new Date(scanResult.checkInTime).toLocaleTimeString('fr-FR')}</span>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-600 mb-6">{error}</p>}

            <button
              onClick={() => { setScanResult(null); setError(null); }}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                error ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              Scanner l'invité suivant
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

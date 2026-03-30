import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, OperationType } from '../types';
import { handleFirestoreError, cn } from '../lib/utils';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle, UserCheck, Clock, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Scanner() {
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const q = query(collection(db, 'guests'), where('id', '==', decodedText.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Code QR invalide. Invité non trouvé.');
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

  const onScanFailure = (error: any) => {
    // Silently ignore scan failures (common when no QR is in view)
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
                {scanResult.plusOnes > 0 && (
                  <div className="text-sm text-black">
                    + {scanResult.plusOnes} invités
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

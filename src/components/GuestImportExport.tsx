import React, { useState } from 'react';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, OperationType } from '../types';
import { handleFirestoreError, generateGuestId } from '../lib/utils';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

export default function GuestImportExport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<{ success: number, failed: number } | null>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let failedCount = 0;

        for (const row of results.data as any[]) {
          try {
            const guestData = {
              id: row.id || generateGuestId(),
              name: row.name || row.Name || 'Unknown Guest',
              email: row.email || row.Email || '',
              phone: row.phone || row.Phone || '',
              status: 'invited',
              plusOnes: parseInt(row.plusOnes || row.PlusOnes) || 0,
              lastUpdated: new Date().toISOString()
            };
            await addDoc(collection(db, 'guests'), guestData);
            successCount++;
          } catch (err) {
            console.error('Failed to import row:', row, err);
            failedCount++;
          }
        }

        setResults({ success: successCount, failed: failedCount });
        setImporting(false);
      },
      error: (err) => {
        console.error('CSV Parsing Error:', err);
        setImporting(false);
      }
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const q = query(collection(db, 'guests'));
      const snapshot = await getDocs(q);
      const guestData = snapshot.docs.map(doc => doc.data());

      const csv = Papa.unparse(guestData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `wedding_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'guests');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-wedding-accent/10 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Upload className="w-8 h-8 text-wedding-accent" />
          </div>
          <h3 className="text-xl font-serif font-bold mb-2">Importer des invités</h3>
          <p className="text-sm text-black mb-6">
            Téléchargez un fichier CSV avec les colonnes : name, email, phone, plusOnes.
          </p>
          <label className="block">
            <span className="sr-only">Choisir un fichier CSV</span>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="block w-full text-sm text-black file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-wedding-accent hover:file:bg-primary-100 transition-all cursor-pointer"
            />
          </label>
          {importing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-wedding-accent font-medium">
              <div className="w-4 h-4 border-2 border-primary-200 border-t-wedding-accent rounded-full animate-spin" />
              Importation des invités...
            </div>
          )}
        </div>

        <div className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-wedding-accent/10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Download className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-serif font-bold mb-2">Exporter le rapport</h3>
          <p className="text-sm text-black mb-6">
            Téléchargez la liste complète des invités et le statut de présence au format CSV.
          </p>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-wedding-accent text-white rounded-xl font-semibold hover:bg-wedding-accent/90 transition-all shadow-lg shadow-wedding-accent/20 flex items-center justify-center gap-2"
          >
            {exporting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText className="w-5 h-5" />}
            Exporter en CSV
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white/40 backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-wedding-accent/10"
          >
            <h3 className="text-lg font-serif font-bold mb-4">Résultats de l'importation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="flex items-center gap-2 text-green-700 font-bold text-2xl mb-1">
                  <CheckCircle className="w-6 h-6" />
                  {results.success}
                </div>
                <div className="text-sm text-green-600">Importé avec succès</div>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 text-red-700 font-bold text-2xl mb-1">
                  <AlertCircle className="w-6 h-6" />
                  {results.failed}
                </div>
                <div className="text-sm text-red-600">Échec de l'importation</div>
              </div>
            </div>
            <button 
              onClick={() => setResults(null)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              Effacer les résultats
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

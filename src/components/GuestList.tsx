import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, GuestStatus, OperationType } from '../types';
import { handleFirestoreError, generateGuestId, cn, getWhatsAppShareLink } from '../lib/utils';
import { Search, Filter, Trash2, Edit2, UserPlus, QrCode, MessageCircle, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';

export default function GuestList() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestStatus | 'all'>('all');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const selectedGuest = guests.find(g => g.docId === selectedGuestId);
  const guestToDelete = guests.find(g => g.docId === deletingGuestId);

  useEffect(() => {
    const q = query(collection(db, 'guests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guestData = snapshot.docs.map(doc => {
        const data = doc.data() as Guest;
        return { ...data, docId: doc.id }; // Keep docId separate to avoid overwriting custom id
      });
      setGuests(guestData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });

    return () => unsubscribe();
  }, []);

  const downloadQRCode = () => {
    if (!qrRef.current || !selectedGuest) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR_${selectedGuest.name.replace(/\s+/g, '_')}.png`;
    link.href = url;
    link.click();
  };

  const shareQRCode = async () => {
    if (!qrRef.current || !selectedGuest || !navigator.share) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const file = new File([blob], `QR_${selectedGuest.name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Code QR de l'invité",
          text: `Code QR pour ${selectedGuest.name}`
        });
      } else {
        // Fallback to text share if file share is not supported
        await navigator.share({
          title: "ID de l'invité",
          text: `ID de l'invité pour ${selectedGuest.name}: ${selectedGuest.id}`
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || 
                          g.email?.toLowerCase().includes(search.toLowerCase()) ||
                          g.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || g.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async () => {
    if (!deletingGuestId) return;
    try {
      await deleteDoc(doc(db, 'guests', deletingGuestId));
      setDeletingGuestId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `guests/${deletingGuestId}`);
    }
  };

  const handleUpdate = async (guest: Guest & { docId: string }) => {
    try {
      const { docId, ...data } = guest;
      const guestRef = doc(db, 'guests', docId);
      await updateDoc(guestRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      setEditingGuest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.docId}`);
    }
  };

  const handleAdd = async (guest: Partial<Guest>) => {
    try {
      const newGuest = {
        ...guest,
        id: guest.id || generateGuestId(),
        status: guest.status || 'invited',
        lastUpdated: new Date().toISOString()
      };
      await addDoc(collection(db, 'guests'), newGuest);
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guests');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher des invités par nom, email ou ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-primary-100 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all bg-white/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
            <select
              className="pl-9 pr-4 py-2 rounded-xl border border-primary-100 focus:outline-none focus:ring-2 focus:ring-wedding-accent appearance-none bg-white/50"
              value={filter}
              onChange={(e) => setFilter(e.target.value as GuestStatus | 'all')}
            >
              <option value="all">Tous les statuts</option>
              <option value="invited">Invité</option>
              <option value="confirmed">Confirmé</option>
              <option value="not_attending">Ne participe pas</option>
              <option value="arrived">Arrivé</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-wedding-accent text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-100"
          >
            <UserPlus className="w-4 h-4" />
            <span className="font-medium">Ajouter un invité</span>
          </button>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-lg rounded-2xl shadow-sm border border-primary-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-primary-50/30 border-b border-primary-100">
                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Invité</th>
                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {filteredGuests.map((guest) => (
                <tr key={guest.docId} className="hover:bg-primary-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 serif text-lg">{guest.name}</span>
                      <span className="text-xs text-black font-serif italic">{guest.email || "Pas d'email"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      guest.status === 'arrived' ? "bg-primary-100 text-wedding-accent" :
                      guest.status === 'confirmed' ? "bg-green-100 text-green-700" :
                      guest.status === 'not_attending' ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {guest.status === 'arrived' ? 'Arrivé' :
                       guest.status === 'confirmed' ? 'Confirmé' :
                       guest.status === 'not_attending' ? 'Absent' :
                       'Invité'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-black">
                    {guest.id}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {guest.phone && (
                        <a 
                          href={getWhatsAppShareLink(guest.phone, guest.name, guest.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-black hover:text-green-600 transition-colors"
                          title="Partager via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      <button 
                        onClick={() => setSelectedGuestId(guest.docId)}
                        className="p-2 text-black hover:text-wedding-accent transition-colors"
                        title="Voir le code QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingGuest(guest)}
                        className="p-2 text-black hover:text-wedding-accent transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingGuestId(guest.docId)}
                        className="p-2 text-black hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredGuests.length === 0 && (
          <div className="p-12 text-center text-black font-serif italic">
            Aucun invité trouvé correspondant à votre recherche.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingGuestId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/70 backdrop-blur-lg p-8 rounded-3xl shadow-xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-gray-500 mb-8">
                Êtes-vous sûr de vouloir supprimer <strong>{guestToDelete?.name}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingGuestId(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedGuestId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/70 backdrop-blur-lg p-8 rounded-3xl shadow-xl max-w-sm w-full text-center"
            >
              <h3 className="text-2xl font-bold mb-2 serif">Code QR de l'invité</h3>
              <p className="text-sm text-gray-500 mb-6 font-serif italic">
                {selectedGuest?.name}
              </p>
              <div ref={qrRef} className="bg-primary-50/50 p-6 rounded-3xl inline-block mb-6 border border-primary-100">
                <QRCodeCanvas value={selectedGuest?.id || ''} size={200} level="H" fgColor="#ea7377" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={downloadQRCode}
                    className="flex items-center justify-center gap-2 py-3 bg-primary-50 text-wedding-accent rounded-xl font-medium hover:bg-primary-100 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    PNG
                  </button>
                  {navigator.share && (
                    <button 
                      onClick={shareQRCode}
                      className="flex items-center justify-center gap-2 py-3 bg-primary-50 text-wedding-accent rounded-xl font-medium hover:bg-primary-100 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      Partager
                    </button>
                  )}
                </div>
                {selectedGuest?.phone && (
                  <a 
                    href={getWhatsAppShareLink(selectedGuest.phone, selectedGuest.name, selectedGuest.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-wedding-accent text-white rounded-xl font-medium hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-100"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Partager via WhatsApp
                  </a>
                )}
                <button 
                  onClick={() => setSelectedGuestId(null)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingGuest) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/70 backdrop-blur-lg p-8 rounded-3xl shadow-xl max-w-md w-full"
            >
              <h3 className="text-2xl font-bold mb-6 serif">
                {editingGuest ? "Modifier l'invité" : "Ajouter un nouvel invité"}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  status: (formData.get('status') as GuestStatus) || 'invited',
                };
                if (editingGuest) {
                  handleUpdate({ ...editingGuest, ...data });
                } else {
                  handleAdd(data);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-widest mb-1">Nom complet</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={editingGuest?.name}
                    className="w-full px-4 py-2 rounded-xl border border-primary-100 focus:ring-2 focus:ring-wedding-accent outline-none bg-primary-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-widest mb-1">Adresse e-mail</label>
                  <input 
                    name="email" 
                    type="email"
                    defaultValue={editingGuest?.email}
                    className="w-full px-4 py-2 rounded-xl border border-primary-100 focus:ring-2 focus:ring-wedding-accent outline-none bg-primary-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-widest mb-1">Numéro de téléphone</label>
                  <input 
                    name="phone" 
                    defaultValue={editingGuest?.phone}
                    className="w-full px-4 py-2 rounded-xl border border-primary-100 focus:ring-2 focus:ring-wedding-accent outline-none bg-primary-50/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-widest mb-1">Statut</label>
                  <select 
                    name="status"
                    defaultValue={editingGuest?.status || 'invited'}
                    className="w-full px-4 py-2 rounded-xl border border-primary-100 focus:ring-2 focus:ring-wedding-accent outline-none bg-primary-50/30"
                  >
                    <option value="invited">Invité</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="not_attending">Ne participe pas</option>
                    <option value="arrived">Arrivé</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingGuest(null); }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-wedding-accent text-white rounded-xl font-medium hover:bg-primary-600 transition-all shadow-lg shadow-primary-100"
                  >
                    {editingGuest ? 'Enregistrer' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

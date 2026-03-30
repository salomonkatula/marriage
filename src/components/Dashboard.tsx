import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Guest, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { Users, CheckCircle, UserCheck, UserX, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'guests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guestData = snapshot.docs.map(doc => doc.data() as Guest);
      setGuests(guestData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.status === 'confirmed' || g.status === 'arrived').length,
    arrived: guests.filter(g => g.status === 'arrived').length,
    notAttending: guests.filter(g => g.status === 'not_attending').length,
    totalExpected: guests.filter(g => g.status === 'confirmed' || g.status === 'arrived')
      .reduce((acc, g) => acc + 1 + (g.plusOnes || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-6 h-6 text-wedding-accent" />} 
          label="Total invités" 
          value={stats.total} 
          subValue={`${stats.totalExpected} personnes au total`}
          delay={0}
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6 text-green-600" />} 
          label="Confirmés" 
          value={stats.confirmed} 
          subValue={`${Math.round((stats.confirmed / stats.total) * 100 || 0)}% des invités`}
          delay={0.1}
        />
        <StatCard 
          icon={<UserCheck className="w-6 h-6 text-wedding-accent" />} 
          label="Enregistrés" 
          value={stats.arrived} 
          subValue={`${stats.arrived} invités arrivés`}
          delay={0.2}
        />
        <StatCard 
          icon={<UserX className="w-6 h-6 text-red-500" />} 
          label="Ne participent pas" 
          value={stats.notAttending} 
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/40 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-wedding-accent/10">
          <h3 className="text-xl font-bold mb-4 serif text-gray-900">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-4">
            <ActionButton 
              onClick={() => onNavigate('guests')} 
              icon={<Users className="w-5 h-5" />} 
              label="Gérer les invités" 
              color="bg-primary-50 text-wedding-accent border border-wedding-accent/10"
            />
            <ActionButton 
              onClick={() => onNavigate('scanner')} 
              icon={<UserCheck className="w-5 h-5" />} 
              label="Scanner le code QR" 
              color="bg-primary-50 text-wedding-accent border border-wedding-accent/10"
            />
            <ActionButton 
              onClick={() => onNavigate('import')} 
              icon={<Plus className="w-5 h-5" />} 
              label="Importer des invités" 
              color="bg-green-50 text-green-600 border border-green-100"
            />
            <ActionButton 
              onClick={() => onNavigate('rsvp')} 
              icon={<CheckCircle className="w-5 h-5" />} 
              label="Portail RSVP" 
              color="bg-primary-50 text-wedding-accent border border-wedding-accent/10"
            />
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-wedding-accent/10">
          <h3 className="text-xl font-bold mb-4 serif text-gray-900">Activité récente</h3>
          <div className="space-y-4">
            {guests
              .filter(g => g.checkInTime || g.lastUpdated)
              .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
              .slice(0, 5)
              .map(guest => (
                <div key={guest.id} className="flex items-center justify-between text-sm border-b border-primary-50 pb-2 last:border-0">
                  <div>
                    <span className="font-bold text-gray-900 serif">{guest.name}</span>
                    <span className="text-gray-500 ml-2 italic font-serif text-xs">
                      {guest.status === 'arrived' ? "s'est enregistré" : "a mis à jour son RSVP"}
                    </span>
                  </div>
                  <span className="text-black text-[10px] font-mono">
                    {new Date(guest.lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            {guests.length === 0 && <p className="text-black text-center py-4 font-serif italic">Aucune activité pour le moment</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, delay }: { icon: React.ReactNode, label: string, value: number, subValue?: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/40 backdrop-blur-lg p-6 rounded-3xl shadow-sm border border-wedding-accent/10 hover:shadow-md hover:border-wedding-accent/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors">{icon}</div>
      </div>
      <div className="text-4xl font-bold text-gray-900 serif mb-1">{value}</div>
      <div className="text-[10px] text-black font-bold uppercase tracking-widest">{label}</div>
      {subValue && <div className="text-xs text-black mt-2 font-serif italic border-t border-primary-50 pt-2">{subValue}</div>}
    </motion.div>
  );
}

function ActionButton({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm",
        color
      )}
    >
      <div className="mb-2 p-2 bg-white/50 rounded-lg">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-center">{label}</span>
    </button>
  );
}

import { cn } from '../lib/utils';

import React from 'react';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

const leads = [
  { id: 'LD-001', date: '28 Avr 2026', client: 'Ferme Bouchama', phone: '+213 555 12 34 56', product: 'Pivot Central 500m', status: 'En attente' },
  { id: 'LD-002', date: '27 Avr 2026', client: 'SARL AgroSud', phone: '+213 661 98 76 54', product: 'Tracteur Série X', status: 'Contacté' },
  { id: 'LD-003', date: '25 Avr 2026', client: 'Coopérative El Oued', phone: '+213 770 11 22 33', product: 'Asperseurs Komet (x200)', status: 'Devis envoyé' },
  { id: 'LD-004', date: '24 Avr 2026', client: 'Domaine Hassi', phone: '+213 555 44 55 66', product: 'Drone Cartographie', status: 'En attente' },
  { id: 'LD-005', date: '22 Avr 2026', client: 'Investissements Verts', phone: '+213 661 77 88 99', product: 'Pivot Central 300m', status: 'Signé' },
];

export const AdminLeads = () => {
  return (
    <div className="p-8" style={{ position: 'relative' }}>
      {/* Top Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Devis en attente</h1>
          <p className="text-white/50">Gérez les demandes de devis et les leads commerciaux.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher un client..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#87A922] w-64"
            />
          </div>
          <button className="bg-white/5 border border-white/10 rounded-xl p-2.5 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider bg-white/[0.02]">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Téléphone</th>
                <th className="px-6 py-4 font-medium">Produit Demandé</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5 text-white/60 font-mono">{lead.date}</td>
                  <td className="px-6 py-5 text-white font-medium">{lead.client}</td>
                  <td className="px-6 py-5 text-white/80">{lead.phone}</td>
                  <td className="px-6 py-5 text-white/80">{lead.product}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide ${
                      lead.status === 'En attente' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                      lead.status === 'Contacté' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                      lead.status === 'Devis envoyé' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                      'bg-green-500/20 text-green-400 border border-green-500/20'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-white/40 hover:text-white transition-colors p-2">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="border-t border-white/5 px-6 py-4 flex items-center justify-between text-sm text-white/50 bg-white/[0.01]">
          <span>Affichage de 1 à 5 sur 24 résultats</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-not-allowed opacity-50">Précédent</button>
            <button className="px-3 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
};
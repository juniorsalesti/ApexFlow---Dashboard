import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Building2, ChevronDown, Plus, LayoutGrid, Settings, Trash2, Edit2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { addCompany, updateCompany, deleteCompany } from '../services/db';

export function CompanySelector() {
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCompany({ name: newCompanyName });
      setNewCompanyName('');
      setIsNewCompanyModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCompany(editingCompany.id, { name: editingCompany.name });
      setEditingCompany(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados vinculados serão mantidos, mas não estarão mais acessíveis por este filtro.')) return;
    try {
      await deleteCompany(id);
      if (selectedCompanyId === id) setSelectedCompanyId(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
      >
        <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded flex items-center justify-center">
          {selectedCompanyId ? <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> : <LayoutGrid className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[150px] truncate">
          {selectedCompanyId ? selectedCompany?.name : 'Todas as Empresas'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden transition-colors">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setSelectedCompanyId(null); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${!selectedCompanyId ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm font-bold">Todas as Empresas</span>
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {companies.map(company => (
                <button
                  key={company.id}
                  onClick={() => { setSelectedCompanyId(company.id); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedCompanyId === company.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium truncate">{company.name}</span>
                </button>
              ))}
              {companies.length === 0 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4 font-bold uppercase tracking-widest">Nenhuma empresa</p>
              )}
            </div>

            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <button 
                onClick={() => { setIsManagerOpen(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-slate-600 dark:text-slate-400"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-bold">Gerenciar Empresas</span>
              </button>
              <button 
                onClick={() => { setIsNewCompanyModalOpen(true); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-violet-600 dark:text-violet-400 mt-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold">Nova Empresa</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Company Manager Modal */}
      <Modal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} title="Gerenciar Empresas">
        <div className="space-y-4">
          {companies.map(company => (
            <div key={company.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              {editingCompany?.id === company.id ? (
                <form onSubmit={handleUpdateCompany} className="flex-1 flex gap-2">
                  <input 
                    type="text" 
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 text-sm dark:text-white"
                    autoFocus
                  />
                  <button type="submit" className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold">Salvar</button>
                  <button type="button" onClick={() => setEditingCompany(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                      <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{company.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Criada em {new Date(company.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company.id)}
                      className="p-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {companies.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              <Building2 className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Você ainda não cadastrou nenhuma empresa.</p>
            </div>
          )}
          <button 
            onClick={() => setIsNewCompanyModalOpen(true)}
            className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-900 transition-all font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Nova Empresa
          </button>
        </div>
      </Modal>

      {/* New Company Modal */}
      <Modal isOpen={isNewCompanyModalOpen} onClose={() => setIsNewCompanyModalOpen(false)} title="Nova Empresa">
        <form onSubmit={handleAddCompany} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome da Empresa</label>
            <input 
              type="text" 
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              placeholder="Ex: Agência Digital X"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Empresa'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

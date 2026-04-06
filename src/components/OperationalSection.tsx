import { Card } from './ui/Card';
import { formatPercent } from '../lib/utils';
import { CheckCircle2, Clock, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface OperationalSectionProps {
  projects: any[];
}

export function OperationalSection({ projects }: OperationalSectionProps) {
  const activeProjects = projects.filter(p => p.status === 'execution').length;
  const deliveredProjects = projects.filter(p => p.status === 'delivered').length;
  const delayedProjects = projects.filter(p => p.status === 'delayed').length;
  
  const onTimeDelivery = projects.length > 0 ? (deliveredProjects / projects.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <Card title="Resumo Operacional">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg transition-colors">
                  <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Projetos Ativos</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white transition-colors">{activeProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Entregas no Prazo</span>
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 transition-colors">{formatPercent(onTimeDelivery)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg transition-colors">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Projetos Atrasados</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white transition-colors">{delayedProjects}</span>
            </div>
          </div>
        </Card>

        <Card title="Saúde da Operação">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">Capacidade da Equipe</span>
                <span className="text-slate-900 dark:text-white">0%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                <div className="h-full bg-violet-500 w-[0%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">Qualidade das Entregas</span>
                <span className="text-slate-900 dark:text-white">0%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                <div className="h-full bg-emerald-500 w-[0%]"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Status dos Projetos" className="lg:col-span-2">
        <div className="space-y-4 md:space-y-6">
          {projects.slice(0, 5).map((project, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-700 transition-colors group">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{project.name}</h5>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border transition-colors',
                    project.status === 'delayed' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' : 
                    project.status === 'execution' ? 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/50' : 
                    'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  )}>
                    {project.status === 'delayed' ? 'Atrasado' : project.status === 'execution' ? 'Em Execução' : 'Finalizado'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                    <div 
                      className={cn(
                        'h-full transition-all duration-500',
                        project.status === 'delayed' ? 'bg-rose-500' : 'bg-violet-500'
                      )} 
                      style={{ width: `${project.status === 'delivered' ? 100 : project.status === 'execution' ? 65 : 10}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{project.status === 'delivered' ? 100 : project.status === 'execution' ? 65 : 10}%</span>
                </div>
              </div>
              <div className="flex md:block items-center justify-between md:text-right min-w-[100px] pt-3 md:pt-0 border-t md:border-t-0 border-slate-50 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white transition-colors">{project.type}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 transition-colors">Atualizado agora</p>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum projeto registrado.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Target, ChevronDown, Sparkles, FileText, Clock3,
  CheckCircle2, XCircle, X, MapPin, User, Activity
} from 'lucide-react';
import { calculateRiskScore, getRiskColor, getRiskLabel } from '../../utils/riskCalculations';
import RiskDetailModal, { RiskFull, ResponsibleEntity } from '../shared/RiskDetailModal';

type RequestItem = {
  id: string;
  name: string;
  category: string;
  date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'closed';
  semester: 'first' | 'second' | 'summer';
};

type StrategicGoalItem = {
  id: number;
  title: string;
  count: number;
};

// -- Raw risk types for normalizing API data --
interface RiskActionMappingDto {
  action?: { actionDescription?: string | null; actionType?: unknown } | null;
}
interface RiskCauseMappingDto {
  cause?: { causeDescription?: string | null } | null;
}
interface RiskGoalMappingDto {
  strategicGoal?: { goalDescription?: string | null } | null;
}
type RawRisk = {
  id?: unknown; riskName?: unknown; riskDescription?: unknown; location?: unknown;
  likelihood?: unknown; impact?: unknown; custom?: unknown; userId?: unknown;
  categoryName?: unknown; categoryID?: unknown; responsibleId?: unknown; department?: unknown;
  strategicGoals?: unknown; riskActions?: unknown; riskCauses?: unknown; riskGoals?: unknown;
  riskactions?: unknown; riskcauses?: unknown; riskgoals?: unknown;
  RiskActions?: RiskActionMappingDto[] | null;
  RiskCauses?: RiskCauseMappingDto[] | null;
  RiskGoals?: RiskGoalMappingDto[] | null;
};

const API_BASE = 'http://localhost:7002/api';

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map(i => i.trim()).filter(Boolean);
};

const extractActionDescriptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (!item || typeof item !== 'object') return '';
    const action = (item as RiskActionMappingDto).action;
    return typeof action?.actionDescription === 'string' ? action.actionDescription.trim() : '';
  }).filter(Boolean);
};

const splitMappedActionsByType = (value: unknown): { reduction: string[]; avoidance: string[] } => {
  if (!Array.isArray(value)) return { reduction: [], avoidance: [] };
  const reduction: string[] = [];
  const avoidance: string[] = [];
  value.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const action = (item as RiskActionMappingDto).action;
    const desc = typeof action?.actionDescription === 'string' ? action.actionDescription.trim() : '';
    if (!desc) return;
    const t = action?.actionType;
    if (t === 0 || t === '0' || t === 'Avoidance') { avoidance.push(desc); return; }
    reduction.push(desc);
  });
  return { reduction, avoidance };
};

const extractCauseDescriptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (!item || typeof item !== 'object') return '';
    const cause = (item as RiskCauseMappingDto).cause;
    return typeof cause?.causeDescription === 'string' ? cause.causeDescription.trim() : '';
  }).filter(Boolean);
};

const extractGoalDescriptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (!item || typeof item !== 'object') return '';
    const goal = (item as RiskGoalMappingDto).strategicGoal;
    return typeof goal?.goalDescription === 'string' ? goal.goalDescription.trim() : '';
  }).filter(Boolean);
};

const normalizeRisk = (risk: RawRisk): RiskFull => {
  const rawActions = risk.riskActions ?? risk.riskactions ?? risk.RiskActions;
  const rawCauses = risk.riskCauses ?? risk.riskcauses ?? risk.RiskCauses;
  const rawGoals = risk.riskGoals ?? risk.riskgoals ?? risk.RiskGoals;

  const directActions = toStringArray(rawActions);
  const directCauses = toStringArray(rawCauses);
  const directGoals = toStringArray(rawGoals);

  const mappedByType = splitMappedActionsByType(rawActions);
  const mappedActions = mappedByType.reduction.length > 0 ? mappedByType.reduction : extractActionDescriptions(rawActions);
  const mappedCauses = extractCauseDescriptions(rawCauses);
  const mappedGoals = extractGoalDescriptions(rawGoals);

  return {
    id: Number(risk.id ?? 0),
    riskName: String(risk.riskName ?? ''),
    riskDescription: String(risk.riskDescription ?? ''),
    location: String(risk.location ?? ''),
    likelihood: Number(risk.likelihood ?? 0),
    impact: Number(risk.impact ?? 0),
    custom: Boolean(risk.custom),
    userId: Number(risk.userId ?? 0),
    categoryName: String(risk.categoryName ?? ''),
    categoryID: Number(risk.categoryID ?? 0),
    responsibleId: Number(risk.responsibleId ?? 0),
    department: String(risk.department ?? ''),
    riskCauses: directCauses.length > 0 ? directCauses : mappedCauses,
    riskActions: directActions.length > 0 ? directActions : mappedActions,
    riskGoals: directGoals.length > 0 ? directGoals : (mappedGoals.length > 0 ? mappedGoals : mappedByType.avoidance),
    strategicGoals: toStringArray(risk.strategicGoals),
  };
};

const Dashboard: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [risks, setRisks] = useState<RiskFull[]>([]);
  const [responsibleEntities, setResponsibleEntities] = useState<ResponsibleEntity[]>([]);
  const [allStrategicGoals, setAllStrategicGoals] = useState<{ id: number, title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoals, setShowGoals] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<StrategicGoalItem | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskFull | null>(null);

  const parseJsonSafe = async (response: Response) => {
    const text = await response.text();
    if (!text) return [];
    try { return JSON.parse(text); } catch { return []; }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [requestsRes, risksRes, respRes, goalsRes] = await Promise.all([
          fetch(`${API_BASE}/requests`, { headers: authHeaders }),
          fetch(`${API_BASE}/risk?include=RiskActions.Action,RiskCauses.Cause,RiskGoals.StrategicGoal`, { headers: authHeaders }),
          fetch(`${API_BASE}/responsible`, { headers: authHeaders }),
          fetch(`${API_BASE}/strategicgoal`, { headers: authHeaders }),
        ]);

        const requestsData = await parseJsonSafe(requestsRes);
        const risksData = await parseJsonSafe(risksRes);
        const respData = await parseJsonSafe(respRes);
        const goalsData = await parseJsonSafe(goalsRes);

        const mapped = (Array.isArray(requestsData) ? requestsData : []).map((r: any) => {
          let statusStr: 'pending' | 'accepted' | 'rejected' | 'closed' = 'pending';
          if (r.status === 3) statusStr = 'accepted';
          else if (r.status === 0) statusStr = 'rejected';
          else statusStr = 'pending';
          return { ...r, status: statusStr };
        });

        const mappedGoals = (Array.isArray(goalsData) ? goalsData : []).map((g: any) => ({
          id: g.id,
          title: g.goalDescription || g.name || g.title || ''
        })).filter(g => g.title);

        setRequests(mapped);
        setRisks(Array.isArray(risksData) ? risksData.map(normalizeRisk) : []);
        setResponsibleEntities(Array.isArray(respData) ? respData : []);
        setAllStrategicGoals(mappedGoals);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setRequests([]);
        setRisks([]);
        setAllStrategicGoals([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedRisk) setSelectedRisk(null);
        else setSelectedGoal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRisk]);

  const stats = useMemo(() => ({
    total: requests.length,
    inProgress: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  const strategicGoals = useMemo(() => {
    const goalsMap = new Map<string, { id: number, title: string, count: number }>();
    
    // Initialize map with all known strategic goals
    allStrategicGoals.forEach(g => {
      goalsMap.set(g.title.trim(), { id: g.id, title: g.title.trim(), count: 0 });
    });

    // Count risks for each goal
    risks.forEach(risk => {
        const goals = Array.isArray(risk.strategicGoals) ? risk.strategicGoals : [];
        const riskGoals = Array.isArray(risk.riskGoals) ? risk.riskGoals : [];
        
        const allAssociatedGoals = Array.from(new Set([...goals, ...riskGoals]));
        
        allAssociatedGoals.forEach(goal => {
        const clean = goal.trim();
        if (!clean) return;
        
        if (goalsMap.has(clean)) {
          const entry = goalsMap.get(clean)!;
          entry.count += 1;
          goalsMap.set(clean, entry);
        } else {
          // Fallback if risk has a goal not in the database (should not happen ideally)
          goalsMap.set(clean, { id: goalsMap.size + 1000, title: clean, count: 1 });
        }
      });
    });

    return Array.from(goalsMap.values())
      .sort((a, b) => b.count !== a.count ? b.count - a.count : a.title.localeCompare(b.title, 'ar'));
  }, [risks, allStrategicGoals]);

  const selectedGoalRisks = useMemo(() => {
    if (!selectedGoal) return [];
    return risks
      .filter(risk => {
        const goals = Array.isArray(risk.strategicGoals) ? risk.strategicGoals : [];
        const riskGoals = Array.isArray(risk.riskGoals) ? risk.riskGoals : [];
        return [...goals, ...riskGoals].some(g => g.trim() === selectedGoal.title.trim());
      })
      .sort((a, b) => calculateRiskScore(b.impact, b.likelihood) - calculateRiskScore(a.impact, a.likelihood));
  }, [risks, selectedGoal]);

  const totalStrategicGoals = strategicGoals.length;

  const getResponsibleEntity = useCallback((responsibleId: number) =>
    responsibleEntities.find(e => e.id === responsibleId),
  [responsibleEntities]);

  const StatCard = ({ title, value, icon, color, borderColor }: {
    title: string; value: number; icon: React.ReactNode; color: string; borderColor: string;
  }) => (
    <div className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 border-r-[6px] ${borderColor} hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div className={`${color} p-3 rounded-2xl shadow-sm`}>{icon}</div>
        <div className="text-right">
          <p className="text-gray-500 text-sm mb-2 font-medium">{title}</p>
          <p className="text-4xl font-black text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-48 mr-auto"></div>
            <div className="h-12 bg-gray-200 rounded-2xl w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Strategic Goals Section */}
        <div className="rounded-[28px] bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 p-[1px] shadow-lg">
          <div className="bg-white rounded-[27px] p-3">
            <button
              type="button"
              onClick={() => setShowGoals(prev => !prev)}
              className="w-full rounded-[24px] bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 text-white px-6 py-6 hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className={`flex items-center gap-3 transition-transform ${showGoals ? 'rotate-180' : ''}`}>
                  <ChevronDown size={26} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <span className="bg-white/15 text-white text-sm px-3 py-1 rounded-full font-bold">{totalStrategicGoals} غاية</span>
                    <Sparkles size={18} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black">الغايات الإستراتيجية</h2>
                  <p className="text-blue-100 mt-2 text-sm md:text-base">كبسة واحدة تعرض كل الغايات الإستراتيجية المرتبطة بالمخاطر المسجلة</p>
                </div>
                <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 items-center justify-center shrink-0">
                  <Target size={30} />
                </div>
              </div>
            </button>

            {showGoals && (
              <div className="mt-4 rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 md:p-8">
                {strategicGoals.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700"><Target size={28} /></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد غايات إستراتيجية حالياً</h3>
                    <p className="text-gray-500">قم بإضافة غايات إستراتيجية للنظام لكي تظهر هنا</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="hidden md:flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">اكبس على أي غاية لعرض الأخطار المرتبطة بها</span>
                      </div>
                      <div className="text-right">
                        <h3 className="text-2xl font-black text-gray-900">جميع الغايات الإستراتيجية</h3>
                        <p className="text-gray-500 mt-1">مرتبة بشكل جميل وواضح لسهولة الاستعراض</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {strategicGoals.map((goal, index) => (
                        <button
                          key={`${goal.title}-${index}`}
                          type="button"
                          onClick={() => setSelectedGoal(goal)}
                          className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-right"
                        >
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-500"></div>

                          {/* Risk count badge - prominent in corner */}
                          <div className="absolute top-3 left-3 w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg font-black text-lg">
                            {goal.count}
                          </div>

                          <div className="flex items-start justify-end gap-4">
                            <div className="text-right flex-1">
                              <div className="flex items-center justify-end gap-2 mb-3">
                                <span className="text-sm text-gray-400 font-bold">#{index + 1}</span>
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
                                  <Target size={18} />
                                </div>
                              </div>
                              <p className="text-gray-900 font-bold leading-8 text-lg">{goal.title}</p>
                              <p className="text-sm text-gray-400 mt-2">
                                {goal.count === 1 ? 'خطر واحد مرتبط' : `${goal.count} مخاطر مرتبطة`}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 font-bold">الطلبات: {stats.total}</div>
              <div className="px-4 py-2 rounded-2xl bg-cyan-50 text-cyan-700 font-bold">الغايات: {totalStrategicGoals}</div>
              <div className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-700 font-bold">المخاطر: {risks.length}</div>
            </div>
            <div className="text-right">
              <p className="text-gray-500 mb-2">عرض مرتب وسريع لأهم مؤشرات النظام</p>
              <h1 className="text-4xl font-black text-gray-900">لوحة المعلومات</h1>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard title="إجمالي الطلبات" value={stats.total} icon={<FileText className="text-white" size={24} />} color="bg-blue-600" borderColor="border-blue-600" />
          <StatCard title="قيد العمل" value={stats.inProgress} icon={<Clock3 className="text-white" size={24} />} color="bg-purple-600" borderColor="border-purple-600" />
          <StatCard title="الطلبات المقبولة" value={stats.accepted} icon={<CheckCircle2 className="text-white" size={24} />} color="bg-green-600" borderColor="border-green-600" />
          <StatCard title="الطلبات المرفوضة" value={stats.rejected} icon={<XCircle className="text-white" size={24} />} color="bg-red-600" borderColor="border-red-600" />
        </div>
      </div>

      {/* Goal Risks Modal */}
      {selectedGoal && !selectedRisk && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
              <button type="button" onClick={() => setSelectedGoal(null)} className="w-11 h-11 rounded-2xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
                <X size={22} />
              </button>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-bold">{selectedGoalRisks.length} خطر</span>
                  <Target size={18} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">{selectedGoal.title}</h3>
                <p className="text-gray-500 mt-1">اضغط على أي خطر لعرض تفاصيله الكاملة</p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-96px)] bg-gray-50">
              {selectedGoalRisks.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center"><Target size={26} /></div>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">لا توجد أخطار مرتبطة بهذه الغاية</h4>
                  <p className="text-gray-500">لم يتم العثور على أخطار مرتبطة بها حاليًا</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedGoalRisks.map((risk) => {
                    const score = calculateRiskScore(risk.impact, risk.likelihood);
                    const responsible = getResponsibleEntity(risk.responsibleId);

                    return (
                      <div
                        key={risk.id}
                        onClick={() => setSelectedRisk(risk)}
                        className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`${getRiskColor(score)} text-white px-3 py-1 rounded-lg text-sm font-bold`}>{getRiskLabel(score)}</div>
                          <div className="text-right flex-1 mr-3">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{risk.riskName}</h3>
                            <p className="text-sm text-gray-500">{risk.categoryName}</p>
                          </div>
                        </div>

                        <p className="text-gray-600 text-right mb-4 line-clamp-2">{risk.riskDescription}</p>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-end gap-2 text-gray-600">
                            <span>{risk.location}</span><MapPin size={16} />
                          </div>
                          <div className="flex items-center justify-end gap-2 text-gray-600">
                            <span>{responsible?.entityName || 'غير محدد'}</span><User size={16} />
                          </div>
                          <div className="flex items-center justify-end gap-2 text-gray-600">
                            <span>{risk.department}</span><Activity size={16} />
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">درجة الخطر</p>
                            <p className="text-2xl font-bold text-gray-800">{score}</p>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-gray-500 mb-1">الأثر</p>
                              <p className="font-bold text-gray-800">{risk.impact}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500 mb-1">الاحتمالية</p>
                              <p className="font-bold text-gray-800">{risk.likelihood}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Risk Detail Modal */}
      {selectedRisk && (
        <RiskDetailModal
          risk={selectedRisk}
          responsibleEntities={responsibleEntities}
          onClose={() => setSelectedRisk(null)}
        />
      )}
    </>
  );
};

export default Dashboard;
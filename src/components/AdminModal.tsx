import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Database,
  Download,
  Eye,
  Flame,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  changeAdminPassword,
  claimAdminPasscode,
  deleteAdminComment,
  deleteAdminGroup,
  deleteAdminPost,
  deleteAdminRegistration,
  exportVotersCsv,
  fetchAdminOverview,
  fetchAdminSchemaSql,
  getAdminStatus,
  loginAdmin,
  loginAdminWithCredentials,
  logoutAdmin,
  resetAdminVotes,
  updateAdminSettings,
} from '../lib/api';
import { AdminOverviewResponse, AdminStatusResponse, AppSettings } from '../types';
import { MEAT_CUTS } from '../data/campaignData';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string | null;
  onSetAdminToken: (token: string | null) => void;
  onPublicDataChanged: () => Promise<void>;
}

type AdminTab = 'behavior' | 'voters' | 'results' | 'groups' | 'moderation' | 'supabase';

const SUPER_ADMIN_EMAIL = 'ariel.ojeda@lupe.com.py';

export function AdminModal({
  isOpen,
  onClose,
  adminToken,
  onSetAdminToken,
  onPublicDataChanged,
}: AdminModalProps) {
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('voters');

  // Auth inputs
  const [loginEmail, setLoginEmail] = useState(SUPER_ADMIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Password change in behavior tab
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // Actions
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voterSearch, setVoterSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [confirmResetVotes, setConfirmResetVotes] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    setActionError(null);
    try {
      const nextStatus = await getAdminStatus(adminToken);
      setStatus(nextStatus);
      if (nextStatus.authenticated && adminToken) {
        const data = await fetchAdminOverview(adminToken);
        setOverview(data);
      } else {
        if (adminToken && !nextStatus.authenticated) {
          onSetAdminToken(null);
        }
        setOverview(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, onSetAdminToken]);

  useEffect(() => {
    if (!isOpen) return;
    loadPanel();
  }, [isOpen, loadPanel]);

  if (!isOpen) return null;

  const refreshAll = async () => {
    if (!adminToken) return;
    const data = await fetchAdminOverview(adminToken);
    setOverview(data);
    await onPublicDataChanged();
  };

  const handleClaimSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passcodeInput.trim().length < 6) {
      setAuthError('Elegí una clave de al menos 6 caracteres.');
      return;
    }
    if (passcodeInput.trim() !== confirmPasscodeInput.trim()) {
      setAuthError('Las dos claves no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { token } = await claimAdminPasscode(passcodeInput.trim());
      setPasscodeInput('');
      setConfirmPasscodeInput('');
      onSetAdminToken(token);
      setActionSuccess('Clave de administrador configurada correctamente.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error configurando clave.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginPassword.trim()) {
      setAuthError('Ingresá tu contraseña de administrador.');
      return;
    }
    setLoading(true);
    try {
      const { token } = await loginAdminWithCredentials(loginEmail.trim(), loginPassword.trim());
      setLoginPassword('');
      onSetAdminToken(token);
      setActionSuccess('Sesión de Super Administrador iniciada correctamente.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Clave de administrador incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      await logoutAdmin(adminToken);
    }
    onSetAdminToken(null);
    setOverview(null);
    setStatus(null);
    setActionSuccess(null);
    setActionError(null);
  };

  const handleToggleSetting = async (key: keyof AppSettings, nextValue: boolean) => {
    if (!adminToken || !overview) return;
    setActionError(null);
    try {
      const updated = await updateAdminSettings(adminToken, { [key]: nextValue });
      setOverview({ ...overview, settings: updated });
      await onPublicDataChanged();
      setActionSuccess('Configuración de la plataforma actualizada.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al actualizar configuración.');
    }
  };

  const handleChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);
    if (newAdminPassword.trim().length < 6) {
      setPasswordChangeError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await changeAdminPassword(adminToken, newAdminPassword.trim());
      setPasswordChangeSuccess(res.message);
      setNewAdminPassword('');
    } catch (err) {
      setPasswordChangeError(err instanceof Error ? err.message : 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!adminToken) return;
    setActionError(null);
    try {
      await exportVotersCsv(adminToken);
      setActionSuccess('Padrón de votantes descargado en formato CSV.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al exportar CSV.');
    }
  };

  const handleResetVotes = async () => {
    if (!adminToken) return;
    setActionError(null);
    try {
      const removed = await resetAdminVotes(adminToken);
      setConfirmResetVotes(false);
      await refreshAll();
      setActionSuccess(`Se reiniciaron los votos del torneo (${removed} votos borrados).`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al reiniciar votos.');
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!adminToken) return;
    setActionError(null);
    try {
      await deleteAdminRegistration(adminToken, id);
      await refreshAll();
      setActionSuccess('Registro eliminado y votos actualizados.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar registro.');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!adminToken) return;
    setActionError(null);
    try {
      await deleteAdminGroup(adminToken, groupId);
      setConfirmDeleteGroupId(null);
      await refreshAll();
      setActionSuccess('Postulación de grupo eliminada.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar grupo.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!adminToken) return;
    setActionError(null);
    try {
      await deleteAdminPost(adminToken, postId);
      await refreshAll();
      setActionSuccess('Publicación del muro eliminada.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar publicación.');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!adminToken) return;
    setActionError(null);
    try {
      await deleteAdminComment(adminToken, postId, commentId);
      await refreshAll();
      setActionSuccess('Comentario eliminado.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar comentario.');
    }
  };

  const handleCopySchemaSql = async () => {
    if (!adminToken) return;
    try {
      const sql = await fetchAdminSchemaSql(adminToken);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(sql);
      }
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo copiar el esquema SQL.');
    }
  };

  const filteredRegistrations = (overview?.registrations ?? []).filter((r) => {
    const q = voterSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      r.profile.name.toLowerCase().includes(q) ||
      (r.profile.email && r.profile.email.toLowerCase().includes(q)) ||
      r.profile.city.toLowerCase().includes(q) ||
      r.profile.memberNumber.toLowerCase().includes(q) ||
      (r.profile.phone && r.profile.phone.toLowerCase().includes(q))
    );
  });

  const filteredGroups = (overview?.groups ?? []).filter((g) => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      g.code.toLowerCase().includes(q) ||
      g.neighborhood.toLowerCase().includes(q) ||
      g.captainName.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      data-testid="admin-modal"
    >
      <div className="w-full max-w-5xl my-6 max-h-[92vh] overflow-y-auto bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-5 sm:p-7 text-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-5 border-b border-white/15">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#D6001C] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider border border-[#E5B83B]">
                SUPER ADMINISTRADOR
              </span>
              <p className="text-xs font-bold text-[#E5B83B] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{SUPER_ADMIN_EMAIL}</span>
              </p>
            </div>
            <h2 id="admin-modal-title" className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
              Panel de Control · El Corte Pilsen
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {status?.authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#071D54] border border-white/20 text-xs font-bold text-white/90 hover:border-[#D6001C] hover:text-[#E5B83B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Salir</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar Panel de Administración"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Auth Gate (Login) */}
        {!status?.authenticated ? (
          <div className="max-w-md mx-auto py-6">
            <div className="bg-[#071D54] border border-[#E5B83B]/60 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-12 h-12 rounded-xl bg-[#D6001C] flex items-center justify-center text-[#E5B83B] shrink-0 border border-[#E5B83B]">
                  <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold uppercase text-white">
                    Acceso Super Administrador
                  </h3>
                  <p className="text-xs text-white/75">
                    Panel reservado para <strong>{SUPER_ADMIN_EMAIL}</strong>
                  </p>
                </div>
              </div>

              {status?.authMode === 'unclaimed' ? (
                <form onSubmit={handleClaimSubmit} className="space-y-3.5">
                  <p className="text-xs text-white/80 bg-[#0B2C7A] p-2.5 rounded-lg border border-white/10">
                    Definí tu contraseña inicial para el Super Administrador {SUPER_ADMIN_EMAIL}.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-white/85 mb-1">
                      Nueva Contraseña Admin (mín. 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/85 mb-1">
                      Confirmar Contraseña Admin
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPasscodeInput}
                      onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>
                  {authError && (
                    <p className="text-xs text-[#E5B83B] bg-[#D6001C]/35 border border-[#D6001C] rounded-lg p-2.5" role="alert">
                      {authError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-pilsen-cta w-full min-h-[46px] rounded-xl font-display text-base font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50"
                  >
                    Guardar y Entrar
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-white/85 mb-1">
                      Correo del Super Administrador
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/85 mb-1">
                      Contraseña de Administrador
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Ingresá tu contraseña"
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                      />
                    </div>
                  </div>
                  {authError && (
                    <p className="text-xs text-[#E5B83B] bg-[#D6001C]/35 border border-[#D6001C] rounded-lg p-2.5" role="alert">
                      {authError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-pilsen-gold w-full min-h-[46px] rounded-xl font-display text-base font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50"
                  >
                    Ingresar al Panel Super Admin
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Authenticated Admin View */
          <div className="space-y-5">
            {/* Live Metrics */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5">
                  <p className="text-[11px] uppercase text-white/70 font-semibold">Votantes Reales</p>
                  <p className="font-mono-tabular text-2xl font-bold text-[#E5B83B]">
                    {overview.registrations.length}
                  </p>
                </div>
                <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5">
                  <p className="text-[11px] uppercase text-white/70 font-semibold">Total Votos Emitidos</p>
                  <p className="font-mono-tabular text-2xl font-bold text-[#E5B83B]">
                    {overview.totalVotes}
                  </p>
                </div>
                <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5">
                  <p className="text-[11px] uppercase text-white/70 font-semibold">Grupos Postulados</p>
                  <p className="font-mono-tabular text-2xl font-bold text-white">
                    {overview.groups.length}
                  </p>
                </div>
                <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5">
                  <p className="text-[11px] uppercase text-white/70 font-semibold">Posts en el Muro</p>
                  <p className="font-mono-tabular text-2xl font-bold text-white">
                    {overview.posts.length}
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {actionError && (
              <p className="text-xs text-[#E5B83B] bg-[#D6001C]/35 border border-[#D6001C] rounded-xl p-3" role="alert">
                {actionError}
              </p>
            )}
            {actionSuccess && (
              <p className="text-xs text-[#E5B83B] bg-[#071D54] border border-[#E5B83B] rounded-xl p-3" role="status">
                {actionSuccess}
              </p>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/15 pb-3" role="tablist">
              {[
                {
                  id: 'voters' as AdminTab,
                  label: `Padrón de Votantes (${overview?.registrations.length ?? 0})`,
                  icon: Users,
                },
                {
                  id: 'results' as AdminTab,
                  label: `Votos en Vivo (${overview?.totalVotes ?? 0})`,
                  icon: Trophy,
                },
                { id: 'behavior' as AdminTab, label: 'Control del Torneo', icon: Settings },
                {
                  id: 'groups' as AdminTab,
                  label: `Grupos (${overview?.groups.length ?? 0})`,
                  icon: Users,
                },
                {
                  id: 'moderation' as AdminTab,
                  label: `Muro y Auditoría (${overview?.posts.length ?? 0})`,
                  icon: MessageSquare,
                },
                { id: 'supabase' as AdminTab, label: 'Base de Datos', icon: Database },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#E5B83B] text-[#071D54] shadow-md'
                        : 'bg-[#071D54] text-white/85 border border-white/15 hover:border-[#E5B83B]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: Padrón de Votantes Reales */}
            {activeTab === 'voters' && overview && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#E5B83B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input
                      type="search"
                      value={voterSearch}
                      onChange={(e) => setVoterSearch(e.target.value)}
                      placeholder="Buscar por nombre, correo electrónico, ciudad o N° Carnet..."
                      className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="btn-pilsen-gold min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
                  >
                    <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Exportar Padrón (CSV)</span>
                  </button>
                </div>

                {filteredRegistrations.length === 0 ? (
                  <div className="bg-[#071D54] rounded-xl p-8 text-center border border-white/15">
                    <p className="text-white/80 text-sm">No se encontraron votantes con ese criterio.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredRegistrations.map((item) => {
                      const isSuper =
                        item.profile.role === 'superadmin' ||
                        item.profile.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

                      return (
                        <div
                          key={item.profile.id}
                          className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isSuper
                              ? 'bg-[#0B2C7A] border-[#E5B83B]'
                              : 'bg-[#071D54] border-white/15 hover:border-white/30'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-tabular text-xs font-bold bg-[#D6001C] text-white px-2 py-0.5 rounded">
                                {item.profile.memberNumber}
                              </span>
                              {isSuper && (
                                <span className="bg-[#E5B83B] text-[#071D54] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                                  SUPER ADMIN
                                </span>
                              )}
                              <p className="font-display text-base font-bold uppercase text-white truncate">
                                {item.profile.name}
                              </p>
                            </div>
                            <p className="text-xs text-white/80 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[#E5B83B] font-semibold">{item.profile.email}</span>
                              {item.profile.phone && <span>· Tel: {item.profile.phone}</span>}
                              {item.profile.ci && <span>· CI: {item.profile.ci}</span>}
                              <span>· Zona: {item.profile.city}</span>
                              <span>· Corte: {item.profile.favoriteCut}</span>
                            </p>
                            <p className="text-[11px] text-white/60">
                              Votos emitidos: <strong className="text-[#E5B83B] font-mono-tabular">{item.votesCount}</strong>
                              {' · '}Registrado: {new Date(item.profile.createdAt).toLocaleDateString('es-PY')}
                            </p>
                          </div>

                          {!isSuper && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistration(item.profile.id)}
                              aria-label={`Eliminar votante ${item.profile.name}`}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#D6001C]/80 hover:bg-[#D6001C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Resultados de Votación en Vivo */}
            {activeTab === 'results' && overview && (
              <div className="space-y-5">
                <div className="bg-[#071D54] border border-[#E5B83B]/60 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/15">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#E5B83B] tracking-wider">
                        Votación Nacional en Tiempo Real
                      </p>
                      <h3 className="font-display text-2xl font-bold uppercase text-white">
                        Votos Reales por Corte
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-white/70 block">Total Votos Oficiales</span>
                      <span className="font-mono-tabular text-3xl font-black text-[#E5B83B]">
                        {overview.totalVotes}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(overview.cutVotes)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cutId, votes]) => {
                        const cutName =
                          cutId === 'retador'
                            ? overview.settings.forceRevealed
                              ? 'El Corte Pilsen (Retador)'
                              : 'Nuevo Retador (En Rombo)'
                            : MEAT_CUTS[cutId as keyof typeof MEAT_CUTS]?.name || cutId;
                        const pct = overview.totalVotes > 0 ? Math.round((votes / overview.totalVotes) * 100) : 0;

                        return (
                          <div key={cutId} className="bg-[#0B2C7A] rounded-xl p-3 border border-white/10">
                            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1">
                              <span className="text-white font-bold">{cutName}</span>
                              <span className="font-mono-tabular text-[#E5B83B]">
                                {votes.toLocaleString('es-PY')} votos ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#D6001C] to-[#E5B83B] transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Control del Torneo (Behavior) */}
            {activeTab === 'behavior' && overview && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    {
                      key: 'votingOpen' as const,
                      title: 'Votación Oficial del Torneo',
                      desc: 'Permite o pausa los votos en las llaves del torneo.',
                      value: overview.settings.votingOpen,
                    },
                    {
                      key: 'groupSubmissionsOpen' as const,
                      title: 'Postulación de Grupos (Máx. 10)',
                      desc: 'Habilita o cierra el formulario de nuevos grupos de amigos.',
                      value: overview.settings.groupSubmissionsOpen,
                    },
                    {
                      key: 'wallPostingOpen' as const,
                      title: 'Muro de la Brasa & Fotos',
                      desc: 'Controla si los visitantes pueden publicar asados y comentar.',
                      value: overview.settings.wallPostingOpen,
                    },
                    {
                      key: 'forceRevealed' as const,
                      title: 'Revelar "El Corte Pilsen" Ahora',
                      desc: 'Muestra la identidad oficial del corte en toda la web.',
                      value: overview.settings.forceRevealed,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-[#071D54] border border-white/15 rounded-xl p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-display text-base font-bold uppercase text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-white/75 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.value}
                        onClick={() => handleToggleSetting(item.key, !item.value)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer shrink-0 transition-colors ${
                          item.value
                            ? 'bg-[#E5B83B] text-[#071D54]'
                            : 'bg-[#0B2C7A] border border-white/25 text-white/80'
                        }`}
                      >
                        {item.value ? 'Abierto' : 'Pausado'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Change Super Admin Password */}
                <div className="bg-[#071D54] border border-[#E5B83B]/50 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#E5B83B]" aria-hidden="true" />
                    <h3 className="font-display text-lg font-bold uppercase text-white">
                      Cambiar Contraseña de Super Administrador ({SUPER_ADMIN_EMAIL})
                    </h3>
                  </div>
                  <form onSubmit={handleChangePasswordSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Nueva contraseña (mín. 6 letras)"
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-pilsen-gold min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Actualizar Contraseña
                    </button>
                  </form>
                  {passwordChangeSuccess && (
                    <p className="text-xs text-[#E5B83B] bg-[#0B2C7A] p-2.5 rounded-lg border border-[#E5B83B]/40">
                      {passwordChangeSuccess}
                    </p>
                  )}
                  {passwordChangeError && (
                    <p className="text-xs text-[#FFF6DC] bg-[#D6001C]/80 p-2.5 rounded-lg border border-[#D6001C]">
                      {passwordChangeError}
                    </p>
                  )}
                </div>

                {/* Reset Votes Action */}
                <div className="bg-[#071D54] border border-[#D6001C] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-base font-bold uppercase text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#D6001C]" aria-hidden="true" />
                      <span>Reiniciar Votos del Torneo</span>
                    </p>
                    <p className="text-xs text-white/75 mt-0.5">
                      Limpia todos los votos emitidos. Los votantes y carnets permanecen intactos.
                    </p>
                  </div>

                  {!confirmResetVotes ? (
                    <button
                      type="button"
                      onClick={() => setConfirmResetVotes(true)}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#D6001C] text-white text-xs font-bold uppercase inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Reiniciar Votos</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetVotes}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D6001C] text-white text-xs font-bold cursor-pointer"
                      >
                        Confirmar Reinicio
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetVotes(false)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0B2C7A] text-white/80 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Grupos de Amigos */}
            {activeTab === 'groups' && overview && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#E5B83B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <input
                    type="search"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Buscar postulación por nombre, código #GRP, capitán o zona..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                  />
                </div>

                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-white/75 bg-[#071D54] rounded-xl p-6 text-center">
                    No hay postulaciones que coincidan con la búsqueda.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className="bg-[#071D54] border border-white/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-[#E5B83B] flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular">{group.code}</span>
                            <span>·</span>
                            <span>{group.zone} ({group.neighborhood})</span>
                            <span>·</span>
                            <span className="font-mono-tabular text-white">{group.likes.toLocaleString('es-PY')} likes</span>
                            <span>·</span>
                            <span>{group.members.length}/10 amigos</span>
                          </p>
                          <p className="font-display text-lg font-bold uppercase text-white truncate">
                            {group.name}
                          </p>
                          <p className="text-xs text-white/75 truncate">
                            Capitán: {group.captainName} · Corte: {group.favoriteCut}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {confirmDeleteGroupId === group.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(group.id)}
                                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D6001C] text-white text-xs font-bold cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteGroupId(null)}
                                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0B2C7A] text-white/80 text-xs font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteGroupId(group.id)}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D6001C]/90 hover:bg-[#D6001C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Muro & Auditoría */}
            {activeTab === 'moderation' && overview && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <h3 className="font-display text-lg font-bold uppercase text-[#E5B83B]">
                    Publicaciones del Muro ({overview.posts.length})
                  </h3>
                  {overview.posts.length === 0 ? (
                    <p className="text-xs text-white/75 bg-[#071D54] border border-white/15 rounded-xl p-4">
                      No hay publicaciones en el Muro.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                      {overview.posts.map((post) => (
                        <div key={post.id} className="bg-[#071D54] border border-white/15 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-white">
                                {post.authorName}{' '}
                                <span className="text-xs font-normal text-white/70">
                                  ({post.authorCity} · {post.cookingPoint})
                                </span>
                              </p>
                              <p className="text-xs text-white/90 mt-1">{post.caption}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="min-h-[34px] px-3 py-1 rounded-lg bg-[#D6001C] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Borrar</span>
                            </button>
                          </div>

                          {post.comments.length > 0 && (
                            <div className="border-t border-white/10 pt-2 space-y-1.5 text-xs text-white/80">
                              <p className="font-semibold text-[#E5B83B]">Comentarios ({post.comments.length}):</p>
                              {post.comments.map((c) => (
                                <div key={c.id} className="flex items-center justify-between gap-2 bg-[#0B2C7A] p-2 rounded-lg">
                                  <p>
                                    <strong className="text-white">{c.author}:</strong> {c.text}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(post.id, c.id)}
                                    className="text-red-400 hover:text-red-200 text-xs font-bold cursor-pointer shrink-0"
                                  >
                                    Borrar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <h3 className="font-display text-lg font-bold uppercase text-[#E5B83B]">
                    Registro de Auditoría (Últimas 50 acciones)
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {overview.moderationLog.map((log) => (
                      <div key={log.id} className="bg-[#071D54] border border-white/10 rounded-lg p-2.5 text-xs flex items-center justify-between gap-3">
                        <div>
                          <span className="font-mono-tabular font-bold text-[#E5B83B] uppercase mr-2">
                            {log.action}
                          </span>
                          <span className="text-white/80">{log.details}</span>
                        </div>
                        <span className="font-mono-tabular text-white/50 text-[11px] shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString('es-PY')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Base de Datos */}
            {activeTab === 'supabase' && overview && (
              <div className="space-y-4">
                <div className="bg-[#071D54] border border-white/15 rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-lg font-bold uppercase text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#E5B83B]" aria-hidden="true" />
                    <span>Estado del Almacenamiento</span>
                  </h3>
                  <div className="text-xs text-white/85 space-y-2">
                    <p>
                      <strong>Modo actual:</strong>{' '}
                      <span className="bg-[#E5B83B] text-[#071D54] px-2 py-0.5 rounded font-bold uppercase">
                        {overview.backendMode === 'supabase' ? 'Supabase PostgreSQL' : 'Archivo Local Persistente (parrilla-db.json)'}
                      </span>
                    </p>
                    <p className="text-white/70">
                      Los datos de votantes, votos del torneo, postulaciones y publicaciones son persistentes y no se pierden al reiniciar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySchemaSql}
                    className="btn-pilsen-gold min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold uppercase inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {copiedSchema ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSchema ? '¡Esquema SQL Copiado!' : 'Copiar Esquema SQL para Supabase'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

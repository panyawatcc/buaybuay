import { useState } from 'react';
import { Users, Mail, Clock, Plus, Lock, Trash2, Send, X } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';
import { useTeamMembers, useTeamInvites } from '../hooks/useFacebookAPI';
import RoleDropdown from '../components/RoleDropdown';
import InviteModal from '../components/InviteModal';

export default function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { members, loading, changeRole, removeMember } = useTeamMembers(!!user && (user.role === 'admin' || user.role === 'manager'));
  const { invites, createInvite, cancelInvite } = useTeamInvites(isAdmin);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleChangeRole = async (id: string, role: string) => {
    if (id === user?.id) { toast('ไม่สามารถเปลี่ยน role ตัวเองได้', 'error'); return; }
    try {
      await changeRole(id, role);
      toast(`เปลี่ยน role สำเร็จ`, 'success');
    } catch { toast('ไม่สามารถเปลี่ยน role ได้', 'error'); }
  };

  const handleRemove = async (id: string) => {
    if (id === user?.id) { toast('ไม่สามารถลบตัวเองได้', 'error'); return; }
    try {
      await removeMember(id);
      toast('ลบสมาชิกแล้ว', 'success');
      setConfirmDeleteId(null);
    } catch { toast('ไม่สามารถลบสมาชิกได้', 'error'); }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelInvite(id);
      toast('ยกเลิกคำเชิญแล้ว', 'success');
    } catch { toast('ไม่สามารถยกเลิกได้', 'error'); }
  };

  // Show current user as fallback when API unavailable
  const displayMembers = members.length > 0 ? members : (user ? [{
    id: user.id, email: user.email, name: user.name, role: user.role,
    isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '',
  }] : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-light" />
          จัดการทีมงาน
        </h1>
        {isAdmin ? (
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            เชิญสมาชิก
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-text-muted bg-surface-light px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" />
            Admin เท่านั้นที่จัดการได้
          </span>
        )}
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface-lighter rounded-lg animate-pulse" />)}
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="bg-surface rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-primary-light mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">ยังไม่มีสมาชิก</h3>
          <p className="text-text-muted text-sm">เชิญสมาชิกคนแรกเพื่อเริ่มทำงานร่วมกัน</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">สมาชิก</th>
                <th className="text-left py-3 px-3">Role</th>
                <th className="text-left py-3 px-3">เข้าใช้ล่าสุด</th>
                <th className="text-center py-3 px-3">สถานะ</th>
                {isAdmin && <th className="text-center py-3 px-3">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {displayMembers.map((m) => (
                <tr key={m.id} className="border-b border-surface-lighter/50 hover:bg-surface-light/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center text-sm font-bold text-primary-light">
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{m.name || '-'}{m.id === user?.id && <span className="text-xs text-text-muted ml-1">(คุณ)</span>}</p>
                        <p className="text-xs text-text-muted flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <RoleDropdown currentRole={m.role} onChangeRole={(role) => handleChangeRole(m.id, role)} disabled={!isAdmin || m.id === user?.id} />
                  </td>
                  <td className="py-3 px-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ยังไม่เคยเข้า'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-center">
                      {m.id !== user?.id && (
                        confirmDeleteId === m.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleRemove(m.id)} className="text-xs bg-danger text-white px-2 py-1 rounded">ยืนยัน</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-text-muted px-2 py-1">ยกเลิก</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(m.id)} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-danger" title="ลบสมาชิก">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites */}
      {isAdmin && invites.length > 0 && (
        <div className="bg-surface rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-text-muted" />
            คำเชิญที่รอ ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-light rounded-lg">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-text-muted">Role: {inv.role} · หมดอายุ: {new Date(inv.expiresAt).toLocaleDateString('th-TH')}</p>
                </div>
                <button onClick={() => handleCancelInvite(inv.id)} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-danger" title="ยกเลิก">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-surface rounded-xl p-6">
        <h3 className="font-semibold mb-4">สรุปทีม</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><p className="text-2xl font-bold">{displayMembers.length}</p><p className="text-sm text-text-muted">สมาชิกทั้งหมด</p></div>
          <div><p className="text-2xl font-bold text-success">{displayMembers.filter((m) => m.isActive).length}</p><p className="text-sm text-text-muted">Active</p></div>
          <div><p className="text-2xl font-bold text-danger">{displayMembers.filter((m) => m.role === 'admin').length}</p><p className="text-sm text-text-muted">แอดมิน</p></div>
          <div><p className="text-2xl font-bold text-info">{invites.length}</p><p className="text-sm text-text-muted">คำเชิญรอ</p></div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && <InviteModal onInvite={createInvite} onClose={() => setShowInvite(false)} />}
    </div>
  );
}

import { useState } from 'react';
import { Settings2, PlayCircle, PauseCircle, Siren } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConnection } from '../components/ConnectionContext';
import { useRules, useAdAccounts, useCampaigns, useAdSets, useAds, type Rule } from '../hooks/useFacebookAPI';
import RuleCard from '../components/RuleCard';
import RuleEditor from '../components/RuleEditor';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Rules() {
  const { toast } = useToast();
  const { fbConnected, selectedAccountId } = useConnection();
  const demoAccountId = 'act_demo_test';
  const effectiveAccountId = selectedAccountId || demoAccountId;
  const { accounts: adAccounts } = useAdAccounts(fbConnected);
  const { rules: apiRules, createRule: apiCreate, toggleRule: apiToggle, updateRule: apiUpdate, deleteRule: apiDelete, refetch: refetchRules } = useRules(true, effectiveAccountId);
  const { campaigns } = useCampaigns(true, effectiveAccountId);
  const { adsets } = useAdSets(true, effectiveAccountId);
  const { ads } = useAds(true, effectiveAccountId);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await apiToggle(id, active);
      const rule = apiRules.find((r) => r.id === id);
      toast(active ? `เปิดกฎ "${rule?.name}" แล้ว` : `หยุดกฎ "${rule?.name}" แล้ว`, active ? 'success' : 'warning');
    } catch { toast('ไม่สามารถเปลี่ยนสถานะได้', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const rule = apiRules.find((r) => r.id === id);
      await apiDelete(id);
      toast(`ลบกฎ "${rule?.name}" แล้ว`, 'success');
      // If deleting the rule being edited, reset form
      if (editingRule?.id === id) setEditingRule(null);
    } catch { toast('ลบไม่สำเร็จ กรุณาลองอีกครั้ง', 'error'); }
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
  };

  const handleSave = async (data: Omit<Rule, 'id' | 'createdAt' | 'lastTriggeredAt' | 'updatedAt'>) => {
    if (editingRule) {
      await apiUpdate(editingRule.id, data);
      toast(`อัปเดตกฎ "${data.name}" แล้ว`, 'success');
    } else {
      await apiCreate(data);
      toast(`สร้างกฎ "${data.name}" สำเร็จ`, 'success');
    }
    setEditingRule(null);
  };

  const handleCancel = () => {
    setEditingRule(null);
  };

  const handleEnableAll = async () => {
    const inactive = apiRules.filter((r) => !r.isActive);
    for (const r of inactive) {
      await apiToggle(r.id, true);
    }
    toast('เปิดกฎทั้งหมดแล้ว', 'success');
  };

  const handleDisableAll = async () => {
    const active = apiRules.filter((r) => r.isActive);
    for (const r of active) {
      await apiToggle(r.id, false);
    }
    toast('หยุดกฎทั้งหมดแล้ว', 'warning');
  };

  const handleEmergencyStop = async () => {
    setShowEmergencyConfirm(false);
    setEmergencyLoading(true);
    try {
      const res = await window.fetch('/api/rules/emergency-pause-all', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to emergency pause');
      await refetchRules();
      toast('🚨 หยุดกฎทั้งหมดฉุกเฉินแล้ว — ทุกกฎถูก disable', 'warning');
    } catch {
      toast('ไม่สามารถหยุดกฎฉุกเฉินได้ กรุณาลองอีกครั้ง', 'error');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const activeCount = apiRules.filter((r) => r.isActive).length;
  const triggeredCount = apiRules.filter((r) => r.lastTriggeredAt).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-primary-light" />
          กฎอัตโนมัติ
        </h1>
        {apiRules.some((r) => r.isActive) && (
          <button
            type="button"
            onClick={() => setShowEmergencyConfirm(true)}
            disabled={emergencyLoading}
            className="flex items-center gap-2 bg-danger hover:bg-danger/80 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Siren className="w-4 h-4" />
            {emergencyLoading ? 'กำลังหยุด...' : '🚨 Emergency: หยุด rules ทั้งหมด'}
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="bg-surface rounded-xl p-4 flex items-center justify-around text-center text-sm">
        <div><p className="text-2xl font-bold">{apiRules.length}</p><p className="text-text-muted text-xs">กฎทั้งหมด</p></div>
        <div className="w-px h-10 bg-surface-lighter" />
        <div><p className="text-2xl font-bold text-success">{activeCount}</p><p className="text-text-muted text-xs">ทำงานอยู่</p></div>
        <div className="w-px h-10 bg-surface-lighter" />
        <div><p className="text-2xl font-bold text-primary-light">{triggeredCount}</p><p className="text-text-muted text-xs">เคยรัน</p></div>
      </div>

      {/* Split layout — always 2 panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form panel (always visible) */}
        <div className="lg:col-span-5">
          <div className="bg-surface rounded-xl p-6 lg:sticky lg:top-4">
            <RuleEditor
              rule={editingRule || undefined}
              accountId={effectiveAccountId}
              adAccounts={adAccounts}
              campaigns={campaigns}
              adSets={adsets}
              ads={ads}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>

        {/* Right: Rule list */}
        <div className="lg:col-span-7">
          {/* Bulk actions */}
          {apiRules.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-muted">รายการกฎ ({apiRules.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleEnableAll} className="flex items-center gap-1.5 text-xs text-success hover:bg-success/10 px-3 py-1.5 rounded-lg transition-colors">
                  <PlayCircle className="w-3.5 h-3.5" />
                  เปิดทั้งหมด
                </button>
                <button onClick={handleDisableAll} className="flex items-center gap-1.5 text-xs text-text-muted hover:bg-surface-lighter px-3 py-1.5 rounded-lg transition-colors">
                  <PauseCircle className="w-3.5 h-3.5" />
                  หยุดทั้งหมด
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {apiRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isEditing={editingRule?.id === rule.id}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            {apiRules.length === 0 && (
              <div className="bg-surface rounded-xl p-12 text-center">
                <p className="text-text-muted">ยังไม่มีกฎ — สร้างกฎแรกของคุณจากฟอร์มด้านซ้าย</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showEmergencyConfirm}
        variant="danger"
        title="หยุดทุก rule ทันที?"
        message={`ระบบจะ disable ทุกกฎที่กำลัง active (${apiRules.filter((r) => r.isActive).length} กฎ) ทันที — rule จะไม่ trigger จนกว่าจะเปิดใหม่ด้วยตนเอง ใช้เฉพาะกรณีฉุกเฉินเท่านั้น`}
        confirmText="ยืนยันหยุดทั้งหมด"
        cancelText="ยกเลิก"
        onConfirm={handleEmergencyStop}
        onCancel={() => setShowEmergencyConfirm(false)}
      />
    </div>
  );
}

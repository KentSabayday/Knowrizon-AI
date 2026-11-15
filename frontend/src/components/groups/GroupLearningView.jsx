import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GroupList } from './GroupList';
import { GroupCreate } from './GroupCreate';
import { GroupDetail } from './GroupDetail';
import { GroupInvitations } from './GroupInvitations';
import { Plus, Users, Loader2 } from 'lucide-react';
import { API_BASE } from '../../lib/api';

export function GroupLearningView() {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchGroups();
      fetchInvitations();
    }
  }, [token]);

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/groups/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleAcceptInvitation = async (groupId) => {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchGroups();
        fetchInvitations();
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineInvitation = async (groupId) => {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchInvitations();
      }
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const handleGroupSelect = (group) => setSelectedGroup(group);
  
  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [...prev, newGroup]);
    setShowCreate(false);
    handleGroupSelect(newGroup);
  };
  
  const handleBack = () => setSelectedGroup(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#FAF9F6] dark:bg-[#0F1115] text-[#141413] dark:text-[#F3F4F6] overflow-hidden">
      <div className={`w-80 border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13161D] flex flex-col ${selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Study Groups</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Collaborative study cohorts</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
              title="Create Study Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {invitations.length > 0 && (
          <GroupInvitations 
            invitations={invitations} 
            onAccept={handleAcceptInvitation} 
            onDecline={handleDeclineInvitation} 
          />
        )}
        <div className="flex-1 overflow-y-auto">
          <GroupList groups={groups} selectedId={selectedGroup?.id} onSelect={handleGroupSelect} />
        </div>
      </div>
      <div className={`flex-1 ${!selectedGroup ? 'hidden md:flex' : 'flex'} flex-col bg-[#FAF9F6] dark:bg-[#0F1115]`}>
        {selectedGroup ? (
          <GroupDetail group={selectedGroup} onBack={handleBack} onUpdate={fetchGroups} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center p-8 space-y-2">
              <Users className="w-12 h-12 mx-auto opacity-30 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No group selected</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select a study group from the list or create a new one to begin.</p>
            </div>
          </div>
        )}
      </div>
      {showCreate && <GroupCreate onClose={() => setShowCreate(false)} onCreate={handleGroupCreated} />}
    </div>
  );
}

export default GroupLearningView;

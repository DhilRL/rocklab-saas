// E:\Projects\Rocklab1\coach-portal\src\components\AssignmentModal.jsx
import React from 'react';
import { X, Plus } from 'lucide-react';

export default function AssignmentModal({ assignmentModal, setAssignmentModal, coaches, handleAssign }) {
  if (!assignmentModal.isOpen) return null;
  
  const availableCoaches = coaches.filter(c => c.role === 'Coach').filter(c => {
    if (assignmentModal.roleType === 'Lead') return c.tier === 'Senior Coach';
    return true; 
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`p-4 text-white flex justify-between items-center ${assignmentModal.roleType === 'Lead' ? 'bg-pink-600' : 'bg-green-600'}`}>
          <h3 className="font-bold text-lg">Assign {assignmentModal.roleType} Coach</h3>
          <button onClick={() => setAssignmentModal({ isOpen: false, shiftId: null, roleType: null })} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">Select a coach to assign to this shift.</p>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {availableCoaches.map(coach => {
              const applicableRate = assignmentModal.roleType === 'Lead' ? coach.leadRate : coach.assistRate;

              return (
                <button
                  key={coach.id}
                  onClick={() => handleAssign(coach.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 transition-colors text-left ${assignmentModal.roleType === 'Lead' ? 'hover:border-pink-500 hover:bg-pink-50' : 'hover:border-green-500 hover:bg-green-50'}`}
                >
                  <div>
                    <div className="font-medium text-gray-900">{coach.name}</div>
                    <div className="text-xs text-gray-500">{coach.tier} • ${applicableRate}/hr for this role</div>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              )
            })}
            {availableCoaches.length === 0 && (
              <div className="text-center p-4 text-gray-500 text-sm">No eligible coaches found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
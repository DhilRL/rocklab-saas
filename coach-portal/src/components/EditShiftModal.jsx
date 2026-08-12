import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, Users, Check, ChevronDown } from 'lucide-react';

export default function EditShiftModal({ 
  editingShift, setEditingShift, schools, coaches, 
  shifts = [], // Default to empty array to prevent crashes
  handleSaveShiftEdit, handleDeleteShift, month, year 
}) {
  if (!editingShift) return null;
  
  // Use the passed shifts array to determine if this is a new shift
  const isNew = !shifts.find(s => s.id === editingShift.id);
  
  const defaultStart = isNew ? '' : (editingShift.startTime || (editingShift.time?.split(' - ')?.[0] || ''));
  const defaultEnd = isNew ? '' : (editingShift.endTime || (editingShift.time?.split(' - ')?.[1] || ''));

  const [formData, setFormData] = useState({ 
    ...editingShift,
    startTime: defaultStart,
    endTime: defaultEnd,
    assignedLead: editingShift.assignedLead || [],
    assignedAssist: editingShift.assignedAssist || []
  });

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [startHr, startMin] = start.split(':').map(Number);
    const [endHr, endMin] = end.split(':').map(Number);
    let diff = (endHr + endMin / 60) - (startHr + startMin / 60);
    if (diff < 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  useEffect(() => {
    const newDuration = calculateDuration(formData.startTime, formData.endTime);
    const newTimeString = `${formData.startTime} - ${formData.endTime}`;
    
    if (formData.duration !== newDuration || formData.time !== newTimeString) {
      setFormData(prev => ({ ...prev, duration: newDuration, time: newTimeString }));
    }
  }, [formData.startTime, formData.endTime]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const toggleInstructor = (coachId, roleType) => {
    const targetField = roleType === 'Lead' ? 'assignedLead' : 'assignedAssist';
    setFormData(prev => {
      const currentList = prev[targetField] || [];
      const newList = currentList.includes(coachId) 
        ? currentList.filter(id => id !== coachId)
        : [...currentList, coachId];
      return { ...prev, [targetField]: newList };
    });
  };

  const handleSchoolChange = (e) => {
    const schoolId = e.target.value;
    const school = schools.find(s => s.id === schoolId);
    
    setFormData(prev => ({ 
      ...prev, 
      schoolId,
      startTime: school?.defaultStartTime || prev.startTime,
      endTime: school?.defaultEndTime || prev.endTime
    }));
  };

  const handleSave = () => {
    const fullDate = new Date(year, month, formData.day);
    const shiftToSave = {
      ...formData,
      date: fullDate.toISOString(),
      year: year,
      month: month
    };
    handleSaveShiftEdit(shiftToSave);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this shift from the calendar?")) {
      handleDeleteShift(formData.id);
    }
  };

  const currentMonthName = new Date(year, month).toLocaleString('default', { month: 'long' });
  const activeCoaches = coaches.filter(c => c.status === 'Active' && c.role === 'Coach');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
        <div className="p-4 text-white flex justify-between items-center bg-slate-800 shrink-0">
          <h3 className="font-bold text-lg">{isNew ? 'Add New Shift' : 'Edit Shift Details'}</h3>
          <button onClick={() => setEditingShift(null)} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Day of Month</label>
              <input type="number" name="day" min="1" max="31" value={formData.day} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900" />
            </div>
            <div className="bg-slate-50 text-slate-500 text-xs font-medium px-4 py-2.5 rounded-lg flex justify-between items-center border border-slate-100">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {currentMonthName} {year}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Start Time</label>
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">End Time</label>
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-900" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">School / Venue</label>
            <select name="schoolId" value={formData.schoolId} onChange={handleSchoolChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium text-gray-900">
              <option value="" disabled>Select a School...</option>
              {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Users className="w-4 h-4 text-teal-600" /> Staff Assignments</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-pink-700 uppercase tracking-widest">Lead Instructors ({formData.assignedLead.length}/{formData.reqLead})</label>
                  <input type="number" name="reqLead" min="0" value={formData.reqLead} onChange={handleChange} className="w-10 text-xs border-b border-gray-300 focus:border-pink-500 outline-none text-center font-bold" />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-1 bg-slate-50/50">
                  {activeCoaches.map(coach => (
                    <button 
                      key={coach.id} 
                      disabled={formData.reqLead === 0}
                      onClick={() => toggleInstructor(coach.id, 'Lead')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium mb-1 transition-all ${formData.reqLead === 0 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : formData.assignedLead.includes(coach.id) ? 'bg-pink-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-700'}`}
                    >
                      <span>{coach.nickname || coach.name}</span>
                      {formData.assignedLead.includes(coach.id) && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-green-700 uppercase tracking-widest">Assist Instructors ({formData.assignedAssist.length}/{formData.reqAssist})</label>
                  <input type="number" name="reqAssist" min="0" value={formData.reqAssist} onChange={handleChange} className="w-10 text-xs border-b border-gray-300 focus:border-green-500 outline-none text-center font-bold" />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-1 bg-slate-50/50">
                  {activeCoaches.map(coach => (
                    <button 
                      key={coach.id} 
                      disabled={formData.reqAssist === 0}
                      onClick={() => toggleInstructor(coach.id, 'Assist')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium mb-1 transition-all ${formData.reqAssist === 0 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : formData.assignedAssist.includes(coach.id) ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-700'}`}
                    >
                      <span>{coach.nickname || coach.name}</span>
                      {formData.assignedAssist.includes(coach.id) && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            {!isNew && (
              <button onClick={handleDelete} title="Delete Shift" className="px-4 py-3 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center shadow-sm">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              disabled={!formData.schoolId || formData.duration <= 0 || !formData.day} 
              onClick={handleSave} 
              className={`flex-1 text-white font-bold py-3 rounded-lg transition-colors ${(!formData.schoolId || formData.duration <= 0 || !formData.day) ? 'bg-gray-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-teal-600 shadow-md'}`}
            >
              {!formData.schoolId ? 'Select a School' : (!formData.day || formData.duration <= 0) ? 'Invalid Time' : isNew ? 'Create Shift' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
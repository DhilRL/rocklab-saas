import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Users, DollarSign, Trash2, ChevronDown, AlertCircle } from 'lucide-react';

export default function EventModal({ isOpen, onClose, coaches, schools, onSave, onDelete, editingEvent, month, year }) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    schoolId: '',
    startTime: '09:00',
    endTime: '15:00',
    duration: 6,
    coachPaidHours: 2,
    schoolBillableHours: 2,
    coachLeadPayRate: 40,
    coachAssistPayRate: 30,
    reqLead: 1,
    reqAssist: 1,
    assignedLead: [],
    assignedAssist: []
  });

  useEffect(() => {
    if (editingEvent) {
      const dateStr = editingEvent.year && editingEvent.month !== undefined && editingEvent.day 
        ? `${editingEvent.year}-${String(editingEvent.month + 1).padStart(2, '0')}-${String(editingEvent.day).padStart(2, '0')}`
        : '';
      
      setFormData({
        name: editingEvent.name || '',
        date: dateStr,
        schoolId: editingEvent.schoolId || '',
        startTime: editingEvent.startTime || '09:00',
        endTime: editingEvent.endTime || '15:00',
        duration: editingEvent.duration || 6,
        coachPaidHours: editingEvent.coachPaidHours || 2,
        schoolBillableHours: editingEvent.schoolBillableHours || 2,
        coachLeadPayRate: editingEvent.coachLeadPayRate || 40,
        coachAssistPayRate: editingEvent.coachAssistPayRate || 30,
        reqLead: editingEvent.reqLead || 1,
        reqAssist: editingEvent.reqAssist || 1,
        assignedLead: editingEvent.assignedLead || [],
        assignedAssist: editingEvent.assignedAssist || []
      });
    } else {
      setFormData({
        name: '',
        date: '',
        schoolId: '',
        startTime: '09:00',
        endTime: '15:00',
        duration: 6,
        coachPaidHours: 2,
        schoolBillableHours: 2,
        coachLeadPayRate: 40,
        coachAssistPayRate: 30,
        reqLead: 1,
        reqAssist: 1,
        assignedLead: [],
        assignedAssist: []
      });
    }
  }, [editingEvent, isOpen]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  useEffect(() => {
    const newDuration = calculateDuration(formData.startTime, formData.endTime);
    if (formData.duration !== newDuration) {
      setFormData(prev => ({ ...prev, duration: newDuration }));
    }
  }, [formData.startTime, formData.endTime]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const toggleInstructor = (coachId, roleType) => {
    const targetField = roleType === 'Lead' ? 'assignedLead' : 'assignedAssist';
    const otherField = roleType === 'Lead' ? 'assignedAssist' : 'assignedLead';
    
    setFormData(prev => {
      // Prevent assigning to both roles
      if (!prev[targetField].includes(coachId) && prev[otherField].includes(coachId)) {
        alert("This coach is already assigned to another role for this event.");
        return prev;
      }

      const currentList = prev[targetField] || [];
      const newList = currentList.includes(coachId) 
        ? currentList.filter(id => id !== coachId)
        : [...currentList, coachId];
      return { ...prev, [targetField]: newList };
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.date || !formData.schoolId) {
      alert("Please fill in event name, date, and select a venue for invoicing.");
      return;
    }

    const dateObj = new Date(formData.date);
    const eventData = {
      ...(editingEvent || {}),
      id: editingEvent?.id || `event_${Date.now()}`,
      type: 'event',
      name: formData.name,
      schoolId: formData.schoolId,
      day: dateObj.getDate(),
      month: dateObj.getMonth(),
      year: dateObj.getFullYear(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      duration: formData.duration,
      coachPaidHours: formData.coachPaidHours,
      schoolBillableHours: formData.schoolBillableHours,
      coachLeadPayRate: formData.coachLeadPayRate,
      coachAssistPayRate: formData.coachAssistPayRate,
      reqLead: formData.reqLead,
      reqAssist: formData.reqAssist,
      assignedLead: formData.assignedLead,
      assignedAssist: formData.assignedAssist,
      time: `${formData.startTime} - ${formData.endTime}`
    };

    onSave(eventData);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      onDelete(editingEvent.id);
      onClose();
    }
  };

  const activeCoaches = coaches.filter(c => c.status === 'Active' && c.role === 'Coach');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">{editingEvent ? 'Edit Special Event' : 'Create Special Event'}</h3>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Custom Pay & Billing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto bg-slate-50/50 flex-grow custom-scrollbar">
          {/* Event Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Event Name</label>
              <input 
                type="text" 
                name="name"
                placeholder="e.g. Annual Climbing Carnival"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Linked Venue <span className="text-[10px] text-slate-400 font-bold">(FOR INVOICING)</span>
              </label>
              <div className="relative group">
                <select
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleChange}
                  className={`w-full bg-slate-50 border ${!formData.schoolId ? 'border-amber-200' : 'border-slate-200'} rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer`}
                >
                  <option value="">-- Select Venue for Billing --</option>
                  {schools?.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Event Date</label>
              <input 
                type="date" 
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Scheduling & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Start Time</label>
              <input 
                type="time" 
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">End Time</label>
              <input 
                type="time" 
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <label className="block text-xs font-black text-emerald-700 uppercase tracking-widest">Coach Paid Hrs</label>
              <input 
                type="number" 
                name="coachPaidHours"
                step="0.5"
                min="0"
                value={formData.coachPaidHours}
                onChange={handleChange}
                className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 font-black text-emerald-700 outline-none text-xl"
              />
            </div>
            <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-xs font-black text-blue-700 uppercase tracking-widest">School Billable Hrs</label>
              <input 
                type="number" 
                name="schoolBillableHours"
                step="0.5"
                min="0"
                value={formData.schoolBillableHours}
                onChange={handleChange}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-black text-blue-700 outline-none text-xl"
              />
            </div>
          </div>

          {/* Custom Pay Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-4">
              <h4 className="text-xs font-black text-pink-800 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Lead Coach Payroll Rate
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-pink-600 uppercase mb-1">Hourly Rate ($)</label>
                  <input 
                    type="number" 
                    name="coachLeadPayRate"
                    value={formData.coachLeadPayRate}
                    onChange={handleChange}
                    className="w-full bg-white border border-pink-200 rounded-xl px-4 py-3 font-black text-pink-700 outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="text-center pt-5">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Total/Coach</div>
                   <div className="text-xl font-black text-pink-700">${(formData.coachLeadPayRate * formData.coachPaidHours).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-green-50/50 rounded-2xl border border-green-100 space-y-4">
              <h4 className="text-xs font-black text-green-800 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Assist Coach Payroll Rate
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Hourly Rate ($)</label>
                  <input 
                    type="number" 
                    name="coachAssistPayRate"
                    value={formData.coachAssistPayRate}
                    onChange={handleChange}
                    className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 font-black text-green-700 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="text-center pt-5">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Total/Coach</div>
                   <div className="text-xl font-black text-green-700">${(formData.coachAssistPayRate * formData.coachPaidHours).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Assignment Section */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest px-2">
              Staff Selection
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Assignment */}
              <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-pink-700 uppercase tracking-widest">Leads Needed</span>
                  <input type="number" name="reqLead" min="0" value={formData.reqLead} onChange={handleChange} className="w-12 text-center font-black text-pink-700 border-b-2 border-pink-200 outline-none" />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {activeCoaches.map(coach => {
                    const isSelected = formData.assignedLead.includes(coach.id);
                    const isOtherSelected = formData.assignedAssist.includes(coach.id);
                    const isReqZero = formData.reqLead === 0;
                    const isDisabled = isOtherSelected || isReqZero;

                    return (
                      <button 
                        key={coach.id} 
                        disabled={isDisabled}
                        onClick={() => toggleInstructor(coach.id, 'Lead')}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-pink-600 text-white border-pink-500 shadow-md' : isDisabled ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed grayscale' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-pink-300'}`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>{(coach.nickname || coach.name).substring(0, 2).toUpperCase()}</div>
                           <span>{coach.nickname || coach.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assist Assignment */}
              <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-green-700 uppercase tracking-widest">Assists Needed</span>
                  <input type="number" name="reqAssist" min="0" value={formData.reqAssist} onChange={handleChange} className="w-12 text-center font-black text-green-700 border-b-2 border-green-200 outline-none" />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {activeCoaches.map(coach => {
                    const isSelected = formData.assignedAssist.includes(coach.id);
                    const isOtherSelected = formData.assignedLead.includes(coach.id);
                    const isReqZero = formData.reqAssist === 0;
                    const isDisabled = isOtherSelected || isReqZero;

                    return (
                      <button 
                        key={coach.id} 
                        disabled={isDisabled}
                        onClick={() => toggleInstructor(coach.id, 'Assist')}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-green-600 text-white border-green-500 shadow-md' : isDisabled ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed grayscale' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-green-300'}`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>{(coach.nickname || coach.name).substring(0, 2).toUpperCase()}</div>
                           <span>{coach.nickname || coach.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-100/90 border-t border-slate-200 flex flex-col sm:flex-row gap-4 items-center shrink-0">
          <div className="flex-grow flex items-center gap-3 w-full sm:w-auto">
             {editingEvent && (
               <button 
                 onClick={handleDelete}
                 className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-200 bg-white flex items-center justify-center gap-2 shadow-sm"
               >
                 <Trash2 className="w-4 h-4" /> Delete Event
               </button>
             )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-white transition-all border border-slate-200 bg-transparent">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-[2] sm:flex-none px-12 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-slate-900 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/30 flex items-center justify-center gap-2 active:scale-[0.98]">
              <Check className="w-5 h-5" /> {editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

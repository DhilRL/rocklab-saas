import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Plus, Users, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BatchShiftModal({ isOpen, onClose, schools, coaches, onSave, month, year, monthNames }) {
  if (!isOpen) return null;

  const [selectedDays, setSelectedDays] = useState([]);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    schoolId: '',
    reqLead: 1,
    reqAssist: 1,
    assignedLead: [],
    assignedAssist: [],
  });

  // Calendar Logic (Starts on Monday)
  const getCalendarGrid = (m, y) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let firstDayOfMonth = new Date(y, m, 1).getDay(); // 0=Sun, 1=Mon...
    // Adjust to Monday start: 0(Sun) becomes 6, 1(Mon) becomes 0
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    const grid = [];
    for (let i = 0; i < startOffset; i++) grid.push(null);
    for (let i = 1; i <= daysInMonth; i++) grid.push(i);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  };

  const calendarGrid = getCalendarGrid(month, year);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
    if (!day) return;
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleTextChange = (e) => {
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

  const calculateDuration = (start, end) => {
    const [startHr, startMin] = start.split(':').map(Number);
    const [endHr, endMin] = end.split(':').map(Number);
    let diff = (endHr + endMin / 60) - (startHr + startMin / 60);
    if (diff < 0) diff += 24;
    return Math.round(diff * 100) / 100;
  };

  const handleBatchSave = () => {
    const duration = calculateDuration(formData.startTime, formData.endTime);
    const shifts = selectedDays.map(day => ({
      id: `batch_${Date.now()}_${day}`,
      day,
      month,
      year,
      startTime: formData.startTime,
      endTime: formData.endTime,
      time: `${formData.startTime} - ${formData.endTime}`,
      duration,
      schoolId: formData.schoolId,
      reqLead: formData.reqLead,
      reqAssist: formData.reqAssist,
      assignedLead: formData.assignedLead,
      assignedAssist: formData.assignedAssist,
      date: new Date(year, month, day).toISOString()
    }));
    onSave(shifts);
    setSelectedDays([]);
    onClose();
  };

  const activeCoaches = coaches.filter(c => c.status === 'Active' && c.role === 'Coach');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto">
        <div className="p-4 text-white flex justify-between items-center bg-teal-700 shrink-0">
          <div>
            <h3 className="font-bold text-lg">Mass Add Shifts</h3>
            <p className="text-teal-100 text-xs">Create multiple staffed shifts for {monthNames[month]} {year}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Select Days in Calendar Grid */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-teal-600" /> Step 1: Select Days ({selectedDays.length} selected)
            </label>
            
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {weekDays.map(d => <div key={d} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarGrid.map((day, idx) => (
                  <button
                    key={idx}
                    disabled={!day}
                    onClick={() => toggleDay(day)}
                    className={`h-12 border-r border-b border-gray-100 flex items-center justify-center text-sm font-bold transition-all
                      ${!day ? 'bg-gray-50/30' : selectedDays.includes(day) 
                        ? 'bg-teal-600 text-white shadow-inner' 
                        : 'bg-white text-gray-600 hover:bg-teal-50 hover:text-teal-600'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
            {/* Step 2: Shift Details */}
            <div className="space-y-6">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-teal-600" /> Step 2: Shift Details
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Time</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">School / Venue</label>
                <select name="schoolId" value={formData.schoolId} onChange={handleSchoolChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                  <option value="" disabled>Select School...</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Step 3: Staffing */}
            <div className="space-y-6">
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
                <Users className="w-4 h-4 text-teal-600" /> Step 3: Assign Staff
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-pink-700 uppercase">Leads</span>
                    <input type="number" name="reqLead" min="0" value={formData.reqLead} onChange={handleTextChange} className="w-8 text-xs border-b border-gray-200 text-center font-bold outline-none" />
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-1 bg-slate-50">
                    {activeCoaches.map(coach => (
                      <button 
                        key={coach.id} 
                        disabled={formData.reqLead === 0}
                        onClick={() => toggleInstructor(coach.id, 'Lead')} 
                        className={`w-full text-left px-2 py-1 rounded text-[10px] font-bold mb-1 transition-colors ${formData.reqLead === 0 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : formData.assignedLead.includes(coach.id) ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 hover:bg-pink-100'}`}
                      >
                        {coach.nickname || coach.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-green-700 uppercase">Assists</span>
                    <input type="number" name="reqAssist" min="0" value={formData.reqAssist} onChange={handleTextChange} className="w-8 text-xs border-b border-gray-200 text-center font-bold outline-none" />
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-1 bg-slate-50">
                    {activeCoaches.map(coach => (
                      <button 
                        key={coach.id} 
                        disabled={formData.reqAssist === 0}
                        onClick={() => toggleInstructor(coach.id, 'Assist')} 
                        className={`w-full text-left px-2 py-1 rounded text-[10px] font-bold mb-1 transition-colors ${formData.reqAssist === 0 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : formData.assignedAssist.includes(coach.id) ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-100'}`}
                      >
                        {coach.nickname || coach.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
          <button 
            disabled={selectedDays.length === 0 || !formData.schoolId}
            onClick={handleBatchSave}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-md
              ${(selectedDays.length === 0 || !formData.schoolId) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-teal-600 text-white hover:bg-teal-700 active:transform active:scale-[0.98]'}`}
          >
            <Check className="w-5 h-5" />
            Create {selectedDays.length} Staffed Shifts
          </button>
        </div>
      </div>
    </div>
  );
}